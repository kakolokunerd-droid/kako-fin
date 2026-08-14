import { Transaction, Goal, UserProfile, Notification, PaidTransactionsMap, PaidTransactionInfo, CategoryBudget, InstallmentPlan } from "../types";
import { supabase } from "./supabaseClient";

import { hashPassword, verifyPassword } from './passwordService';

class CloudDatabase {
  // Cache para evitar verificação repetida
  private supabaseConfiguredCache: boolean | null = null;

  // Verifica se o Supabase está configurado
  private isSupabaseConfigured(): boolean {
    // Usar cache se já foi verificado
    if (this.supabaseConfiguredCache !== null) {
      return this.supabaseConfiguredCache;
    }

    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const isConfigured = !!(url && key && url !== "" && key !== "");

    // Log apenas na primeira verificação
    if (isConfigured) {
      console.log("🔍 Supabase detectado - usando banco de dados remoto");
    } else {
      console.log("💾 Supabase não configurado - usando localStorage");
    }

    // Armazenar no cache
    this.supabaseConfiguredCache = isConfigured;
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
      const tableName = key === "transactions" ? "transactions" : key === "goals" ? "goals" : "shopping";
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
      } else if (tableName === "goals") {
        return (data as any[]).map((g) => ({
          id: g.id,
          name: g.name,
          targetAmount: parseFloat(g.target_amount),
          currentAmount: parseFloat(g.current_amount),
          deadline: g.deadline,
        })) as T[];
      } else if (tableName === "shopping") {
        return (data as any[]).map((s) => ({
          id: s.id,
          name: s.name,
          type: s.type,
          purchaseDate: s.purchase_date,
          amount: parseFloat(s.amount),
          installments: s.installments || undefined,
          category: s.category,
        })) as T[];
      }
      return [] as T[];
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
      const tableName = key === "transactions" ? "transactions" : key === "goals" ? "goals" : "shopping";

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
        let dbItem: any;
        
        if (tableName === "transactions") {
          dbItem = {
            id: item.id,
            user_id: userId,
            description: item.description,
            amount: item.amount.toString(),
            date: item.date,
            category: item.category,
            type: item.type,
          };
        } else if (tableName === "goals") {
          dbItem = {
            id: item.id,
            user_id: userId,
            name: item.name,
            target_amount: item.targetAmount.toString(),
            current_amount: item.currentAmount.toString(),
            deadline: item.deadline,
          };
        } else if (tableName === "shopping") {
          dbItem = {
            id: item.id,
            user_id: userId,
            name: item.name,
            type: item.type,
            purchase_date: item.purchaseDate,
            amount: item.amount.toString(),
            installments: item.installments || null,
            category: item.category,
          };
        }

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
      if (profile) {
        const parsed = JSON.parse(profile);
        return {
          ...parsed,
          lastContributionDate: parsed.lastContributionDate || undefined,
          role: parsed.role || 'user',
          // Campos de assinatura (com fallback)
          subscriptionPlan: parsed.subscriptionPlan || 'trial',
          subscriptionStartedAt: parsed.subscriptionStartedAt || undefined,
          subscriptionExpiresAt: parsed.subscriptionExpiresAt || null,
          isTrialActive: parsed.isTrialActive ?? true,
        };
      }
      return null;
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
        lastContributionDate: data.last_contribution_date || undefined,
        role: (data.role as 'admin' | 'user') || 'user',
        // Campos de assinatura
        subscriptionPlan: data.subscription_plan || 'trial',
        subscriptionStartedAt: data.subscription_started_at || undefined,
        subscriptionExpiresAt: data.subscription_expires_at || null,
        isTrialActive: data.is_trial_active ?? true,
      };
      } catch (error) {
        console.error("Erro ao buscar perfil do Supabase:", error);
        const profile = localStorage.getItem(`fintrack_profile_${email}`);
        if (profile) {
          const parsed = JSON.parse(profile);
          return {
            ...parsed,
            role: parsed.role || 'user',
            // Campos de assinatura (com fallback)
            subscriptionPlan: parsed.subscriptionPlan || 'trial',
            subscriptionStartedAt: parsed.subscriptionStartedAt || undefined,
            subscriptionExpiresAt: parsed.subscriptionExpiresAt || null,
            isTrialActive: parsed.isTrialActive ?? true,
          };
        }
        return null;
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
          last_contribution_date: profile.lastContributionDate || null,
          role: profile.role || 'user',
          // Campos de assinatura
          subscription_plan: profile.subscriptionPlan || 'trial',
          subscription_started_at: profile.subscriptionStartedAt || new Date().toISOString(),
          subscription_expires_at: profile.subscriptionExpiresAt || null,
          is_trial_active: profile.isTrialActive ?? true,
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

  // Busca de senha do usuário (retorna hash)
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

  // Verifica se a senha está correta
  async verifyPassword(email: string, password: string): Promise<boolean> {
    const hashedPassword = await this.getPassword(email);
    if (!hashedPassword) {
      return false;
    }
    
    // Verificar se é hash (contém :) ou senha antiga em texto plano (para migração)
    if (hashedPassword.includes(':')) {
      // É um hash, usar verificação
      return await verifyPassword(password, hashedPassword);
    } else {
      // Senha antiga em texto plano (migração)
      if (password === hashedPassword) {
        // Migrar para hash
        const newHash = await hashPassword(password);
        await this.savePassword(email, newHash);
        return true;
      }
      return false;
    }
  }

  // Deletar uma transação específica por ID
  async deleteTransaction(userId: string, transactionId: string): Promise<void> {
    if (!this.isSupabaseConfigured()) {
      // Fallback para localStorage
      const key = `fintrack_${userId}_transactions`;
      const data = localStorage.getItem(key);
      if (data) {
        const transactions: Transaction[] = JSON.parse(data);
        const filtered = transactions.filter(t => t.id !== transactionId);
        localStorage.setItem(key, JSON.stringify(filtered));
        console.log(`✅ Transação ${transactionId} removida do localStorage`);
      }
      return;
    }

    try {
      const { error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", transactionId)
        .eq("user_id", userId);

      if (error) {
        console.error("❌ Erro ao deletar transação:", error);
        throw error;
      } else {
        console.log(`✅ Transação ${transactionId} removida do banco`);
      }
    } catch (error) {
      console.error("Erro ao remover transação do banco:", error);
      throw error;
    }
  }

  // Remover transações do banco por mês/ano e tipo
  async deleteTransactionsByMonth(
    userId: string,
    month: number, // 1-12
    year: number,
    type?: 'expense' | 'income',
    itemNamesToUpdate?: Set<string> // Nomes dos itens que estão sendo atualizados (para remover apenas esses)
  ): Promise<void> {
    if (!this.isSupabaseConfigured()) {
      // Para localStorage, remover do array local
      const key = `fintrack_${userId}_transactions`;
      const data = localStorage.getItem(key);
      if (data) {
        const transactions: Transaction[] = JSON.parse(data);
        const filtered = transactions.filter(t => {
          const [tYearStr, tMonthStr] = t.date.split('-');
          const tYear = parseInt(tYearStr);
          const tMonth = parseInt(tMonthStr); // 1-12
          const matchesMonth = tMonth === month && tYear === year;
          const matchesType = type ? t.type === type : true;
          
          // Se itemNamesToUpdate foi fornecido, remover apenas transações relacionadas a esses itens
          if (itemNamesToUpdate && matchesMonth && matchesType && t.type === 'expense') {
            // Verificar se é uma parcela (padrão: "Nome (x/y)")
            const parcelMatch = t.description.match(/^(.+?)\s+\(\d+\/\d+\)$/);
            if (parcelMatch) {
              // É uma parcela: verificar se o nome base está na lista de itens a atualizar
              const itemName = parcelMatch[1];
              if (itemNamesToUpdate.has(itemName)) {
                return false; // Remover esta parcela
              }
            } else {
              // Não é uma parcela: verificar se a descrição está na lista de itens a atualizar
              if (itemNamesToUpdate.has(t.description)) {
                return false; // Remover esta transação
              }
            }
            // Se não está na lista de itens a atualizar, preservar (não remover)
            return true;
          }
          
          // Se itemNamesToUpdate não foi fornecido, remover todas as transações do tipo especificado do mês
          return !(matchesMonth && matchesType);
        });
        localStorage.setItem(key, JSON.stringify(filtered));
        console.log(`✅ Removidas ${transactions.length - filtered.length} transações do localStorage`);
      }
      return;
    }

    try {
      // Buscar todas as transações do usuário
      const { data: allTransactions, error: fetchError } = await supabase
        .from("transactions")
        .select("id, date, type, description")
        .eq("user_id", userId);

      if (fetchError) {
        console.error("❌ Erro ao buscar transações para remoção:", fetchError);
        return;
      }

      // Filtrar IDs das transações que devem ser removidas
      const idsToDelete = (allTransactions || [])
        .filter(t => {
          const [tYearStr, tMonthStr] = t.date.split('-');
          const tYear = parseInt(tYearStr);
          const tMonth = parseInt(tMonthStr); // 1-12
          const matchesMonth = tMonth === month && tYear === year;
          const matchesType = type ? t.type === type : true;
          
          // Se itemNamesToUpdate foi fornecido, remover apenas transações relacionadas a esses itens
          if (itemNamesToUpdate && matchesMonth && matchesType && t.type === 'expense') {
            // Verificar se é uma parcela (padrão: "Nome (x/y)")
            const parcelMatch = t.description.match(/^(.+?)\s+\(\d+\/\d+\)$/);
            if (parcelMatch) {
              // É uma parcela: verificar se o nome base está na lista de itens a atualizar
              const itemName = parcelMatch[1];
              if (itemNamesToUpdate.has(itemName)) {
                return true; // Remover esta parcela
              }
            } else {
              // Não é uma parcela: verificar se a descrição está na lista de itens a atualizar
              if (itemNamesToUpdate.has(t.description)) {
                return true; // Remover esta transação
              }
            }
            // Se não está na lista de itens a atualizar, preservar (não remover)
            return false;
          }
          
          // Se itemNamesToUpdate não foi fornecido, remover todas as transações do tipo especificado do mês
          return matchesMonth && matchesType;
        })
        .map(t => t.id);

      if (idsToDelete.length === 0) {
        console.log(`ℹ️ Nenhuma transação encontrada para remover (mês ${month}/${year}, tipo: ${type || 'todos'})`);
        return;
      }

      console.log(`🗑️ Removendo ${idsToDelete.length} transações do mês ${month}/${year} (tipo: ${type || 'todos'})${itemNamesToUpdate ? ` relacionadas aos itens: ${Array.from(itemNamesToUpdate).join(', ')}` : ''}`);

      // Deletar transações
      const { error: deleteError } = await supabase
        .from("transactions")
        .delete()
        .eq("user_id", userId)
        .in("id", idsToDelete);

      if (deleteError) {
        console.error("❌ Erro ao deletar transações:", deleteError);
      } else {
        console.log(`✅ ${idsToDelete.length} transações removidas do banco`);
      }
    } catch (error) {
      console.error("Erro ao remover transações do banco:", error);
    }
  }

  // Salvamento de senha do usuário (com hash automático)
  async savePassword(email: string, password: string, isHashed: boolean = false): Promise<void> {
    // Se não estiver hasheada, fazer hash
    let passwordToSave = password;
    if (!isHashed && !password.includes(':')) {
      passwordToSave = await hashPassword(password);
    }

    // Salvar no localStorage primeiro (cache local)
    localStorage.setItem(`fintrack_password_${email}`, passwordToSave);

    // Se Supabase estiver configurado, salvar também lá
    if (this.isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from("profiles")
          .update({ password: passwordToSave })
          .eq("email", email);

        if (error) {
          console.error("❌ Erro ao salvar senha no Supabase:", error);
          // Tentar inserir se não existir
          const { error: insertError } = await supabase
            .from("profiles")
            .upsert({ email, password: passwordToSave }, { onConflict: "email" });

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

  // Recuperação de senha - gera e salva senha provisória
  async recoverPassword(email: string, temporaryPassword: string): Promise<boolean> {
    try {
      // Salvar senha provisória (já hasheada)
      await this.savePassword(email, temporaryPassword);
      return true;
    } catch (error) {
      console.error("Erro ao recuperar senha:", error);
      return false;
    }
  }

  // ========== NOTIFICAÇÕES ==========
  
  async getNotifications(userId: string): Promise<Notification[]> {
    // Buscar do localStorage (pode ter notificações globais ou específicas do usuário)
    const userNotifications = await this.getDataLocalStorage<Notification>("notifications", userId);
    const globalNotifications = await this.getDataLocalStorage<Notification>("notifications", "global");
    
    // Garantir que são arrays
    const userNotifs = Array.isArray(userNotifications) ? userNotifications : [];
    const globalNotifs = Array.isArray(globalNotifications) ? globalNotifications : [];
    
    // Combinar notificações do usuário e globais
    const allLocalNotifications = [...userNotifs, ...globalNotifs];
    
    if (!this.isSupabaseConfigured()) {
      return allLocalNotifications;
    }

    try {
      // Buscar todas as notificações
      const { data: notificationsData, error: notificationsError } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (notificationsError) {
        console.error("❌ Erro ao buscar notificações do Supabase:", notificationsError);
        console.log("💾 Usando notificações do localStorage...");
        return allLocalNotifications;
      }

      // Log apenas se houver notificações ou se for a primeira vez
      if (notificationsData && notificationsData.length > 0) {
        console.log("📬 Notificações encontradas no Supabase:", notificationsData.length);
      }

      if (!notificationsData || notificationsData.length === 0) {
        return allLocalNotifications;
      }

      // Buscar quais notificações este usuário já leu e quais foram deletadas (pode falhar se a tabela não existir)
      let readNotificationIds = new Set<string>();
      let readNotificationsMap = new Map<string, string>();
      let deletedNotificationIds = new Set<string>();
      
      try {
        const { data: readsData, error: readsError } = await supabase
          .from("notification_reads")
          .select("notification_id, read_at, deleted_at")
          .eq("user_id", userId);

        if (readsError) {
          console.warn("⚠️ Tabela notification_reads não encontrada ou erro ao buscar:", readsError);
          console.log("📝 Continuando sem verificar leituras...");
        } else {
          // Separar notificações lidas e deletadas
          const reads = readsData || [];
          readNotificationIds = new Set(
            reads
              .filter(r => r.read_at && !r.deleted_at) // Apenas as que foram lidas e não foram deletadas
              .map(r => r.notification_id)
          );

          readNotificationsMap = new Map(
            reads
              .filter(r => r.read_at && !r.deleted_at)
              .map(r => [r.notification_id, r.read_at])
          );

          // Notificações deletadas pelo usuário
          deletedNotificationIds = new Set(
            reads
              .filter(r => r.deleted_at) // Apenas as que foram deletadas
              .map(r => r.notification_id)
          );
        }
      } catch (readsError) {
        console.warn("⚠️ Erro ao buscar leituras de notificações:", readsError);
      }

      // Mapear notificações com status de leitura do usuário e filtrar deletadas
      const supabaseNotifications = (notificationsData as any[])
        .filter(n => !deletedNotificationIds.has(n.id)) // Filtrar notificações deletadas pelo usuário
        .map((n) => {
          const isRead = readNotificationIds.has(n.id);
          return {
            id: n.id,
            title: n.title,
            message: n.message,
            createdBy: n.created_by,
            createdAt: n.created_at,
            isRead: isRead,
            readAt: isRead ? readNotificationsMap.get(n.id) : undefined,
          } as Notification;
        });

      // Combinar notificações do Supabase com as do localStorage
      const combined = [...supabaseNotifications, ...allLocalNotifications];
      // Remover duplicatas baseado no ID (priorizar Supabase)
      const uniqueMap = new Map<string, Notification>();
      // Primeiro adicionar do localStorage
      allLocalNotifications.forEach(n => {
        if (!uniqueMap.has(n.id)) {
          uniqueMap.set(n.id, n);
        }
      });
      // Depois adicionar do Supabase (sobrescreve se existir)
      supabaseNotifications.forEach(n => {
        uniqueMap.set(n.id, n);
      });
      
      return Array.from(uniqueMap.values());
    } catch (error) {
      console.error("Erro ao buscar notificações do Supabase:", error);
      console.log("💾 Usando notificações do localStorage...");
      return allLocalNotifications;
    }
  }

  async createNotification(notification: Omit<Notification, 'id' | 'isRead' | 'readAt'>): Promise<void> {
    // Função auxiliar para criar no localStorage
    const createInLocalStorage = async () => {
      const allUsers = this.getAllUserIds();
      const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const newNotification: Notification = {
        id: notificationId,
        ...notification,
        isRead: false,
      };
      
      // Se não houver usuários, criar uma notificação global que será compartilhada
      if (allUsers.length === 0) {
        // Criar uma chave global para notificações
        const globalNotifications = await this.getDataLocalStorage<Notification>("notifications", "global");
        const globalNotifs = Array.isArray(globalNotifications) ? globalNotifications : [];
        globalNotifs.unshift(newNotification);
        await this.saveDataLocalStorage("notifications", "global", globalNotifs);
      } else {
        // Criar para cada usuário
        for (const userId of allUsers) {
          const notifications = await this.getDataLocalStorage<Notification>("notifications", userId);
          const userNotifs = Array.isArray(notifications) ? notifications : [];
          userNotifs.unshift(newNotification);
          await this.saveDataLocalStorage("notifications", userId, userNotifs);
        }
      }
    };

    if (!this.isSupabaseConfigured()) {
      await createInLocalStorage();
      return;
    }

    try {
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          title: notification.title,
          message: notification.message,
          created_by: notification.createdBy,
          created_at: notification.createdAt,
          is_read: false,
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Erro ao criar notificação no Supabase:", error);
        console.log("💾 Fazendo fallback para localStorage...");
        // Fazer fallback para localStorage se houver erro
        await createInLocalStorage();
        return;
      }

      console.log("✅ Notificação criada no Supabase:", data);

      // Também criar no localStorage para garantir que apareça imediatamente
      // Usar o ID do Supabase se disponível
      const notificationId = data?.id || `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const allUsers = this.getAllUserIds();
      const newNotification: Notification = {
        id: notificationId,
        ...notification,
        isRead: false,
      };
      
      if (allUsers.length === 0) {
        // Criar notificação global
        const globalNotifications = await this.getDataLocalStorage<Notification>("notifications", "global");
        const globalNotifs = Array.isArray(globalNotifications) ? globalNotifications : [];
        globalNotifs.unshift(newNotification);
        await this.saveDataLocalStorage("notifications", "global", globalNotifs);
      } else {
        // Criar para cada usuário
        for (const userId of allUsers) {
          const notifications = await this.getDataLocalStorage<Notification>("notifications", userId);
          const userNotifs = Array.isArray(notifications) ? notifications : [];
          userNotifs.unshift(newNotification);
          await this.saveDataLocalStorage("notifications", userId, userNotifs);
        }
      }
    } catch (error) {
      console.error("Erro ao criar notificação no Supabase:", error);
      console.log("💾 Fazendo fallback para localStorage...");
      // Fazer fallback para localStorage se houver erro
      await createInLocalStorage();
    }
  }

  async markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
    // Sempre salvar no localStorage também
    const notifications = await this.getDataLocalStorage<Notification>("notifications", userId);
    const globalNotifications = await this.getDataLocalStorage<Notification>("notifications", "global");
    
    // Garantir que são arrays
    const userNotifs = Array.isArray(notifications) ? notifications : [];
    const globalNotifs = Array.isArray(globalNotifications) ? globalNotifications : [];
    
    // Atualizar no localStorage do usuário
    const updatedUser = userNotifs.map(n => 
      n.id === notificationId 
        ? { ...n, isRead: true, readAt: new Date().toISOString() }
        : n
    );
    await this.saveDataLocalStorage("notifications", userId, updatedUser);
    
    // Atualizar nas notificações globais também
    const updatedGlobal = globalNotifs.map(n => 
      n.id === notificationId 
        ? { ...n, isRead: true, readAt: new Date().toISOString() }
        : n
    );
    await this.saveDataLocalStorage("notifications", "global", updatedGlobal);

    if (!this.isSupabaseConfigured()) {
      return;
    }

    try {
      const { error } = await supabase
        .from("notification_reads")
        .upsert({
          notification_id: notificationId,
          user_id: userId,
          read_at: new Date().toISOString(),
        }, {
          onConflict: 'notification_id,user_id'
        });

      if (error) {
        console.warn("⚠️ Erro ao marcar notificação como lida no Supabase (tabela pode não existir):", error);
        console.log("💾 Notificação marcada como lida no localStorage");
        // Não lançar erro, já salvamos no localStorage
        return;
      }

      console.log("✅ Notificação marcada como lida no Supabase");
    } catch (error) {
      console.warn("⚠️ Erro ao marcar notificação como lida:", error);
      console.log("💾 Notificação marcada como lida no localStorage");
      // Não lançar erro, já salvamos no localStorage
    }
  }

  async deleteNotification(userId: string, notificationId: string): Promise<void> {
    // Sempre remover do localStorage primeiro (para garantir exclusão mesmo sem Supabase)
    const notifications = await this.getDataLocalStorage<Notification>("notifications", userId);
    const globalNotifications = await this.getDataLocalStorage<Notification>("notifications", "global");
    
    const userNotifs = Array.isArray(notifications) ? notifications : [];
    const globalNotifs = Array.isArray(globalNotifications) ? globalNotifications : [];
    
    // Remover das notificações do usuário
    const filteredUser = userNotifs.filter(n => n.id !== notificationId);
    await this.saveDataLocalStorage("notifications", userId, filteredUser);
    
    // Remover das notificações globais também
    const filteredGlobal = globalNotifs.filter(n => n.id !== notificationId);
    await this.saveDataLocalStorage("notifications", "global", filteredGlobal);

    // Se Supabase estiver configurado, também marcar como deletada lá
    if (this.isSupabaseConfigured()) {
      try {
        // No Supabase, marcar como deletada para o usuário específico na tabela notification_reads
        const { error } = await supabase
          .from("notification_reads")
          .upsert({
            notification_id: notificationId,
            user_id: userId,
            deleted_at: new Date().toISOString(),
          }, {
            onConflict: 'notification_id,user_id'
          });

        if (error) {
          console.warn("⚠️ Erro ao excluir notificação no Supabase (tabela pode não existir):", error);
          console.log("💾 Notificação excluída do localStorage");
          // Não lançar erro, já salvamos no localStorage
          return;
        }

        console.log("✅ Notificação excluída no Supabase");
      } catch (error) {
        console.warn("⚠️ Erro ao excluir notificação no Supabase:", error);
        console.log("💾 Notificação excluída do localStorage");
        // Não lançar erro, já salvamos no localStorage
      }
    }
  }

  private getAllUserIds(): string[] {
    // Buscar todos os IDs de usuários do localStorage
    const userIds: string[] = [];
    const seen = new Set<string>();
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('fintrack_')) {
        // Extrair userId de diferentes formatos de chave
        let userId = '';
        
        // Formato: fintrack_{userId}_transactions
        if (key.includes('_transactions')) {
          userId = key.replace('fintrack_', '').replace('_transactions', '');
        }
        // Formato: fintrack_{userId}_goals
        else if (key.includes('_goals')) {
          userId = key.replace('fintrack_', '').replace('_goals', '');
        }
        // Formato: fintrack_{userId}_shopping
        else if (key.includes('_shopping')) {
          userId = key.replace('fintrack_', '').replace('_shopping', '');
        }
        // Formato: fintrack_profile_{userId}
        else if (key.includes('_profile_')) {
          userId = key.replace('fintrack_profile_', '');
        }
        
        if (userId && !seen.has(userId) && userId !== 'global') {
          seen.add(userId);
          userIds.push(userId);
        }
      }
    }
    
    console.log('👥 Usuários encontrados no localStorage:', userIds.length, userIds);
    return userIds;
  }

  // ========== STATUS DE PAGAMENTO DAS TRANSAÇÕES ==========

  private getPaidLocalStorageKey(userId: string): string {
    return `fintrack_${userId}_paid_transactions`;
  }

  private normalizePaidMap(raw: unknown): PaidTransactionsMap {
    const result: PaidTransactionsMap = {};
    if (!raw) return result;

    // Formato antigo: string[]
    if (Array.isArray(raw)) {
      for (const id of raw) {
        if (typeof id === 'string') {
          result[id] = { paidAmount: -1 }; // -1 = usar valor integral da transação
        }
      }
      return result;
    }

    if (typeof raw === 'object') {
      for (const [id, value] of Object.entries(raw as Record<string, unknown>)) {
        if (typeof value === 'number') {
          result[id] = { paidAmount: value };
        } else if (value && typeof value === 'object' && 'paidAmount' in (value as object)) {
          const paidAmount = Number((value as PaidTransactionInfo).paidAmount);
          result[id] = {
            paidAmount: Number.isFinite(paidAmount) ? paidAmount : -1,
            updatedAt: (value as PaidTransactionInfo).updatedAt,
          };
        }
      }
    }
    return result;
  }

  private getPaidMapFromLocalStorage(userId: string): PaidTransactionsMap {
    try {
      const key = this.getPaidLocalStorageKey(userId);
      const stored = localStorage.getItem(key);
      if (!stored) return {};
      return this.normalizePaidMap(JSON.parse(stored));
    } catch (error) {
      console.error('Erro ao ler transações pagas do localStorage:', error);
      return {};
    }
  }

  private savePaidMapToLocalStorage(userId: string, map: PaidTransactionsMap): void {
    try {
      const key = this.getPaidLocalStorageKey(userId);
      localStorage.setItem(key, JSON.stringify(map));
    } catch (error) {
      console.error('Erro ao salvar transações pagas no localStorage:', error);
    }
  }

  /** Resolve o valor efetivamente pago (-1 no storage = valor integral) */
  resolvePaidAmount(info: PaidTransactionInfo | undefined, originalAmount: number): number {
    if (!info) return 0;
    if (info.paidAmount < 0) return originalAmount;
    return info.paidAmount;
  }

  // Buscar mapa de transações pagas (id -> valor pago)
  async getPaidTransactionsMap(userId: string): Promise<PaidTransactionsMap> {
    if (!this.isSupabaseConfigured()) {
      return this.getPaidMapFromLocalStorage(userId);
    }

    try {
      const { data, error } = await supabase
        .from('transaction_status')
        .select('transaction_id, paid_amount, is_paid, updated_at')
        .eq('user_id', userId)
        .eq('is_paid', true);

      if (error) {
        console.warn('⚠️ Erro ao buscar status de pagamento no Supabase. Usando localStorage.', error);
        return this.getPaidMapFromLocalStorage(userId);
      }

      const map: PaidTransactionsMap = {};
      for (const row of data || []) {
        const paidAmount =
          row.paid_amount === null || row.paid_amount === undefined
            ? -1
            : Number(row.paid_amount);
        map[row.transaction_id] = {
          paidAmount: Number.isFinite(paidAmount) ? paidAmount : -1,
          updatedAt: row.updated_at || undefined,
        };
      }
      this.savePaidMapToLocalStorage(userId, map);
      return map;
    } catch (error) {
      console.warn('⚠️ Erro ao buscar status de pagamento. Usando localStorage.', error);
      return this.getPaidMapFromLocalStorage(userId);
    }
  }

  // Compat: retorna apenas IDs pagos
  async getPaidTransactionIds(userId: string): Promise<string[]> {
    const map = await this.getPaidTransactionsMap(userId);
    return Object.keys(map);
  }

  // Marcar/desmarcar pagamento com valor efetivo
  async setTransactionPaidStatus(
    userId: string,
    transactionId: string,
    isPaid: boolean,
    paidAmount?: number
  ): Promise<void> {
    const current = this.getPaidMapFromLocalStorage(userId);

    if (isPaid) {
      current[transactionId] = {
        paidAmount:
          paidAmount === undefined || !Number.isFinite(paidAmount) ? -1 : paidAmount,
        updatedAt: new Date().toISOString(),
      };
    } else {
      delete current[transactionId];
    }
    this.savePaidMapToLocalStorage(userId, current);

    if (!this.isSupabaseConfigured()) {
      return;
    }

    try {
      if (isPaid) {
        const { error } = await supabase.from('transaction_status').upsert(
          {
            user_id: userId,
            transaction_id: transactionId,
            is_paid: true,
            paid_amount:
              paidAmount === undefined || !Number.isFinite(paidAmount) ? null : paidAmount,
            updated_at: new Date().toISOString(),
          },
          {
            onConflict: 'user_id,transaction_id',
          }
        );

        if (error) {
          console.warn('⚠️ Erro ao salvar status de pagamento no Supabase:', error);
        }
      } else {
        const { error } = await supabase
          .from('transaction_status')
          .delete()
          .eq('user_id', userId)
          .eq('transaction_id', transactionId);

        if (error) {
          console.warn('⚠️ Erro ao remover status de pagamento no Supabase:', error);
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao atualizar status de pagamento no Supabase:', error);
    }
  }

  // ========== ORÇAMENTOS ==========

  private getBudgetsKey(userId: string) {
    return `fintrack_${userId}_budgets`;
  }

  async getBudgets(userId: string): Promise<CategoryBudget[]> {
      const normalize = (b: any): CategoryBudget => ({
        id: b.id,
        category: b.category,
        monthlyLimit: parseFloat(b.monthlyLimit ?? b.monthly_limit ?? 0),
        period: b.period === 'yearly' ? 'yearly' : 'monthly',
      });

      const fromLocal = (): CategoryBudget[] => {
        try {
          const raw = localStorage.getItem(this.getBudgetsKey(userId));
          return raw ? (JSON.parse(raw) as any[]).map(normalize) : [];
        } catch {
          return [];
        }
      };

      if (!this.isSupabaseConfigured()) return fromLocal();

      try {
        const { data, error } = await supabase
          .from('budgets')
          .select('*')
          .eq('user_id', userId);

        if (error) {
          console.warn('⚠️ Erro ao buscar orçamentos. Usando localStorage.', error);
          return fromLocal();
        }

        const budgets = (data || []).map(normalize);
        localStorage.setItem(this.getBudgetsKey(userId), JSON.stringify(budgets));
        return budgets;
      } catch {
        return fromLocal();
      }
    }

    async saveBudgets(userId: string, budgets: CategoryBudget[]): Promise<void> {
      const normalized = budgets.map((b) => ({
        ...b,
        period: b.period === 'yearly' ? 'yearly' as const : 'monthly' as const,
      }));
      localStorage.setItem(this.getBudgetsKey(userId), JSON.stringify(normalized));

      if (!this.isSupabaseConfigured()) return;

      try {
        await supabase.from('budgets').delete().eq('user_id', userId);
        if (normalized.length === 0) return;

        const { error } = await supabase.from('budgets').insert(
          normalized.map((b) => ({
            id: b.id,
            user_id: userId,
            category: b.category,
            monthly_limit: b.monthlyLimit,
            period: b.period,
            updated_at: new Date().toISOString(),
          }))
        );
        if (error) console.warn('⚠️ Erro ao salvar orçamentos:', error);
      } catch (error) {
        console.warn('⚠️ Erro ao salvar orçamentos:', error);
      }
    }

  // ========== CONTAS LONGAS / PARCELAMENTOS ==========

  private getInstallmentsKey(userId: string) {
    return `fintrack_${userId}_installments`;
  }

  async getInstallmentPlans(userId: string): Promise<InstallmentPlan[]> {
    const fromLocal = (): InstallmentPlan[] => {
      try {
        const raw = localStorage.getItem(this.getInstallmentsKey(userId));
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    };

    if (!this.isSupabaseConfigured()) return fromLocal();

    try {
      const { data, error } = await supabase
        .from('installment_plans')
        .select('*')
        .eq('user_id', userId)
        .order('start_year_month', { ascending: true });

      if (error) {
        console.warn('⚠️ Erro ao buscar parcelamentos. Usando localStorage.', error);
        return fromLocal();
      }

      const plans = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name,
        category: row.category,
        totalAmount: parseFloat(row.total_amount),
        installmentAmount: parseFloat(row.installment_amount),
        totalInstallments: Number(row.total_installments),
        startYearMonth: row.start_year_month,
        dueDay: row.due_day,
        paidNumbers: Array.isArray(row.paid_numbers)
          ? row.paid_numbers.map(Number)
          : typeof row.paid_numbers === 'string'
            ? JSON.parse(row.paid_numbers || '[]')
            : [],
        notes: row.notes || undefined,
      })) as InstallmentPlan[];

      localStorage.setItem(this.getInstallmentsKey(userId), JSON.stringify(plans));
      return plans;
    } catch {
      return fromLocal();
    }
  }

  async saveInstallmentPlans(userId: string, plans: InstallmentPlan[]): Promise<void> {
    localStorage.setItem(this.getInstallmentsKey(userId), JSON.stringify(plans));

    if (!this.isSupabaseConfigured()) return;

    try {
      await supabase.from('installment_plans').delete().eq('user_id', userId);
      if (plans.length === 0) return;

      const { error } = await supabase.from('installment_plans').insert(
        plans.map((p) => ({
          id: p.id,
          user_id: userId,
          name: p.name,
          category: p.category,
          total_amount: p.totalAmount,
          installment_amount: p.installmentAmount,
          total_installments: p.totalInstallments,
          start_year_month: p.startYearMonth,
          due_day: p.dueDay,
          paid_numbers: p.paidNumbers || [],
          notes: p.notes || null,
          updated_at: new Date().toISOString(),
        }))
      );
      if (error) console.warn('⚠️ Erro ao salvar parcelamentos:', error);
    } catch (error) {
      console.warn('⚠️ Erro ao salvar parcelamentos:', error);
    }
  }
}

export const db = new CloudDatabase();
