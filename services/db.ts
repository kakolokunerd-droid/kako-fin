import { Transaction, Goal, UserProfile } from "../types";
import { supabase } from "./supabaseClient";

class CloudDatabase {
  // Verifica se o Supabase está configurado
  private isSupabaseConfigured(): boolean {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const isConfigured = !!(url && key && url !== "" && key !== "");

    if (isConfigured) {
      console.log("🔍 Supabase detectado - usando banco de dados remoto");
    } else {
      console.log("💾 Supabase não configurado - usando localStorage");
    }

    return isConfigured;
  }

  // Fallback para localStorage se Supabase não estiver configurado
  private async getDataLocalStorage<T>(
    key: string,
    userId: string
  ): Promise<T[]> {
    const data = localStorage.getItem(`fintrack_${userId}_${key}`);
    return data ? JSON.parse(data) : [];
  }

  private async saveDataLocalStorage<T>(
    key: string,
    userId: string,
    data: T[]
  ): Promise<void> {
    localStorage.setItem(`fintrack_${userId}_${key}`, JSON.stringify(data));
  }

  // Busca de dados no Supabase ou localStorage (fallback)
  async getData<T>(key: string, userId: string): Promise<T[]> {
    if (!this.isSupabaseConfigured()) {
      return this.getDataLocalStorage<T>(key, userId);
    }

    try {
      const tableName = key === "transactions" ? "transactions" : "goals";
      const { data, error } = await supabase
        .from(tableName)
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(`❌ Erro ao buscar ${key} do Supabase:`, error);
        console.error("Detalhes do erro:", {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
        });
        console.log(`💾 Fazendo fallback para localStorage...`);
        return this.getDataLocalStorage<T>(key, userId);
      }

      console.log(
        `✅ Dados de ${key} carregados do Supabase:`,
        data?.length || 0,
        "itens"
      );

      // Converter dados do Supabase para o formato esperado
      if (tableName === "transactions") {
        return (data as any[]).map((t) => ({
          id: t.id,
          description: t.description,
          amount: parseFloat(t.amount),
          date: t.date,
          category: t.category,
          type: t.type,
        })) as T[];
      } else {
        return (data as any[]).map((g) => ({
          id: g.id,
          name: g.name,
          targetAmount: parseFloat(g.target_amount),
          currentAmount: parseFloat(g.current_amount),
          deadline: g.deadline,
        })) as T[];
      }
    } catch (error) {
      console.error(`Erro ao buscar ${key} do Supabase:`, error);
      return this.getDataLocalStorage<T>(key, userId);
    }
  }

  // Salvamento no Supabase ou localStorage (fallback)
  async saveData<T>(key: string, userId: string, data: T[]): Promise<void> {
    if (!this.isSupabaseConfigured()) {
      return this.saveDataLocalStorage<T>(key, userId, data);
    }

    try {
      const tableName = key === "transactions" ? "transactions" : "goals";

      // Primeiro, buscar dados existentes COMPLETOS (não só IDs)
      const { data: existingData, error: fetchError } = await supabase
        .from(tableName)
        .select("*")
        .eq("user_id", userId);

      if (fetchError) {
        console.error(
          `❌ Erro ao buscar dados existentes de ${key}:`,
          fetchError
        );
        console.error("Detalhes:", {
          message: fetchError.message,
          code: fetchError.code,
          details: fetchError.details,
        });
        console.log(`💾 Fazendo fallback para localStorage...`);
        return this.saveDataLocalStorage<T>(key, userId, data);
      }

      // Se o array local está vazio mas há dados no banco, não fazer nada
      // Isso evita deletar dados quando ainda não carregou
      if (data.length === 0 && existingData && existingData.length > 0) {
        console.log(`⚠️ Array local de ${key} está vazio, mas há ${existingData.length} itens no banco. Pulando salvamento para evitar perda de dados.`);
        return;
      }

      const existingIds = new Set((existingData || []).map((d: any) => d.id));
      const newItems: any[] = [];
      const updatedItems: any[] = [];

      // Separar novos itens e atualizações
      for (const item of data as any[]) {
        const dbItem =
          tableName === "transactions"
            ? {
                id: item.id,
                user_id: userId,
                description: item.description,
                amount: item.amount.toString(),
                date: item.date,
                category: item.category,
                type: item.type,
              }
            : {
                id: item.id,
                user_id: userId,
                name: item.name,
                target_amount: item.targetAmount.toString(),
                current_amount: item.currentAmount.toString(),
                deadline: item.deadline,
              };

        if (existingIds.has(item.id)) {
          updatedItems.push(dbItem);
        } else {
          newItems.push(dbItem);
        }
      }

      // Inserir novos itens
      if (newItems.length > 0) {
        const { error: insertError } = await supabase
          .from(tableName)
          .insert(newItems);

        if (insertError) {
          console.error(`❌ Erro ao inserir ${key}:`, insertError);
        } else {
          console.log(`✅ ${newItems.length} novos itens inseridos em ${key}`);
        }
      }

      // Atualizar itens existentes
      for (const item of updatedItems) {
        const { error: updateError } = await supabase
          .from(tableName)
          .update(item)
          .eq("id", item.id)
          .eq("user_id", userId);

        if (updateError) {
          console.error(`❌ Erro ao atualizar ${key}:`, updateError);
        } else {
          console.log(`✅ Item atualizado em ${key}:`, item.id);
        }
      }

      // Remover itens que não estão mais na lista
      // IMPORTANTE: Só deletar se o array local não estiver vazio
      // Um array vazio pode indicar que os dados ainda não foram carregados
      // e não devemos deletar dados do banco nesse caso
      if (data.length > 0) {
        const currentIds = new Set(data.map((d: any) => d.id));
        const idsToDelete = Array.from(existingIds).filter(
          (id) => !currentIds.has(id)
        );

        if (idsToDelete.length > 0) {
          console.log(`⚠️ Tentando deletar ${idsToDelete.length} itens de ${key} que não estão mais na lista local`);
          
          // Validação adicional: só deletar se não for uma quantidade suspeita
          // Se estiver tentando deletar mais de 50% dos dados existentes, pode ser um erro
          const deleteRatio = idsToDelete.length / existingIds.size;
          if (deleteRatio > 0.5 && existingIds.size > 5) {
            console.warn(`⚠️ ATENÇÃO: Tentativa de deletar ${(deleteRatio * 100).toFixed(0)}% dos dados (${idsToDelete.length} de ${existingIds.size}). Operação cancelada por segurança.`);
            console.warn(`⚠️ Isso pode indicar um problema de sincronização. Verifique se os dados foram carregados corretamente.`);
            return;
          }

          const { error: deleteError } = await supabase
            .from(tableName)
            .delete()
            .eq("user_id", userId)
            .in("id", idsToDelete);

          if (deleteError) {
            console.error(`❌ Erro ao deletar ${key}:`, deleteError);
          } else {
            console.log(`✅ ${idsToDelete.length} itens deletados de ${key}`);
          }
        }
      } else {
        console.log(`ℹ️ Array de ${key} está vazio. Pulando deleção para evitar perda acidental de dados.`);
      }
    } catch (error) {
      console.error(`Erro ao salvar ${key} no Supabase:`, error);
      return this.saveDataLocalStorage<T>(key, userId, data);
    }
  }

  // Busca de perfil no Supabase ou localStorage (fallback)
  async getProfile(email: string): Promise<UserProfile | null> {
    if (!this.isSupabaseConfigured()) {
      const profile = localStorage.getItem(`fintrack_profile_${email}`);
      return profile ? JSON.parse(profile) : null;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Perfil não encontrado
          console.log(`ℹ️ Perfil não encontrado no Supabase para: ${email}`);
          return null;
        }
        console.error("❌ Erro ao buscar perfil do Supabase:", error);
        console.error("Detalhes:", {
          message: error.message,
          code: error.code,
          details: error.details,
        });
        console.log(`💾 Fazendo fallback para localStorage...`);
        const profile = localStorage.getItem(`fintrack_profile_${email}`);
        return profile ? JSON.parse(profile) : null;
      }

      console.log(`✅ Perfil carregado do Supabase para: ${email}`);

      return {
        name: data.name,
        email: data.email,
        avatar: data.avatar || undefined,
        currency: data.currency || "BRL",
      };
    } catch (error) {
      console.error("Erro ao buscar perfil do Supabase:", error);
      const profile = localStorage.getItem(`fintrack_profile_${email}`);
      return profile ? JSON.parse(profile) : null;
    }
  }

  // Salvamento de perfil no Supabase ou localStorage (fallback)
  async saveProfile(profile: UserProfile): Promise<void> {
    if (!this.isSupabaseConfigured()) {
      localStorage.setItem(
        `fintrack_profile_${profile.email}`,
        JSON.stringify(profile)
      );
      localStorage.setItem("fintrack_auth_user", JSON.stringify(profile));
      return;
    }

    try {
      const { error } = await supabase.from("profiles").upsert(
        {
          email: profile.email,
          name: profile.name,
          avatar: profile.avatar || null,
          currency: profile.currency || "BRL",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "email",
        }
      );

      if (error) {
        console.error("❌ Erro ao salvar perfil no Supabase:", error);
        console.error("Detalhes:", {
          message: error.message,
          code: error.code,
          details: error.details,
        });
        console.log(`💾 Fazendo fallback para localStorage...`);
        localStorage.setItem(
          `fintrack_profile_${profile.email}`,
          JSON.stringify(profile)
        );
      } else {
        console.log(`✅ Perfil salvo no Supabase para: ${profile.email}`);
      }

      localStorage.setItem("fintrack_auth_user", JSON.stringify(profile));
    } catch (error) {
      console.error("Erro ao salvar perfil no Supabase:", error);
      localStorage.setItem(
        `fintrack_profile_${profile.email}`,
        JSON.stringify(profile)
      );
      localStorage.setItem("fintrack_auth_user", JSON.stringify(profile));
    }
  }

  // Busca de senha do usuário
  async getPassword(email: string): Promise<string | null> {
    // Primeiro tentar buscar do Supabase
    if (this.isSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("password")
          .eq("email", email)
          .single();

        if (!error && data && data.password) {
          console.log(`✅ Senha encontrada no Supabase para: ${email}`);
          // Também salvar localmente para cache
          localStorage.setItem(`fintrack_password_${email}`, data.password);
          return data.password;
        }
      } catch (error) {
        console.error("Erro ao buscar senha do Supabase:", error);
      }
    }

    // Fallback para localStorage
    const password = localStorage.getItem(`fintrack_password_${email}`);
    return password;
  }

  // Salvamento de senha do usuário
  async savePassword(email: string, password: string): Promise<void> {
    // Salvar no localStorage primeiro (cache local)
    localStorage.setItem(`fintrack_password_${email}`, password);

    // Se Supabase estiver configurado, salvar também lá
    if (this.isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ password: password })
          .eq("email", email);

        if (error) {
          console.error("❌ Erro ao salvar senha no Supabase:", error);
          // Tentar inserir se não existir
          const { error: insertError } = await supabase
            .from("profiles")
            .upsert({ email, password }, { onConflict: "email" });

          if (insertError) {
            console.error("❌ Erro ao inserir senha no Supabase:", insertError);
          } else {
            console.log(`✅ Senha salva no Supabase para: ${email}`);
          }
        } else {
          console.log(`✅ Senha atualizada no Supabase para: ${email}`);
        }
      } catch (error) {
        console.error("Erro ao salvar senha no Supabase:", error);
      }
    }
  }
}

export const db = new CloudDatabase();
