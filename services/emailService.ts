// Serviço para envio automático de emails usando EmailJS

// Declaração de tipo para EmailJS
declare global {
  interface Window {
    emailjs: {
      send: (
        serviceId: string,
        templateId: string,
        templateParams: any,
        publicKey: string
      ) => Promise<any>;
      init: (publicKey: string) => void;
    };
  }
}

/**
 * Envia automaticamente uma senha provisória por email usando EmailJS
 * Requer configuração do EmailJS (gratuito, 200 emails/mês)
 * O email é enviado automaticamente, sem necessidade de intervenção do usuário
 */
export async function sendPasswordRecoveryEmail(
  email: string,
  temporaryPassword: string,
  userName?: string
): Promise<{ success: boolean; message: string }> {
  try {
    const emailjsServiceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
    const emailjsTemplateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
    const emailjsPublicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

    console.log("🔍 Verificando configuração de email...");
    console.log("🔍 EmailJS Service ID:", emailjsServiceId ? "Configurado" : "Não configurado");
    console.log("🔍 EmailJS Template ID:", emailjsTemplateId ? "Configurado" : "Não configurado");
    console.log("🔍 EmailJS Public Key:", emailjsPublicKey ? "Configurado" : "Não configurado");

    if (!emailjsServiceId || !emailjsTemplateId || !emailjsPublicKey) {
      console.error("❌ EmailJS não configurado completamente");
      return {
        success: false,
        message: "Serviço de email não configurado. Configure VITE_EMAILJS_SERVICE_ID, VITE_EMAILJS_TEMPLATE_ID e VITE_EMAILJS_PUBLIC_KEY no arquivo .env.local. Veja EMAIL_SETUP_EMAILJS.md para instruções.",
      };
    }

    // Carregar script do EmailJS dinamicamente se não estiver carregado
    if (!window.emailjs) {
      await loadEmailJSScript();
    }

    console.log("📧 Enviando email automaticamente para:", email);
    
    // Parâmetros do template - IMPORTANTE: os nomes devem corresponder exatamente ao template do EmailJS
    const templateParams = {
      to_email: email,  // Campo para o destinatário
      to_name: userName || "Usuário",
      temporary_password: temporaryPassword,
      subject: "Recuperação de Senha - Kako Fin",
      // EmailJS também pode usar 'reply_to' se necessário
      reply_to: email,
    };

    console.log("📧 Parâmetros do template:", { ...templateParams, temporary_password: "***" });

    try {
      const response = await window.emailjs.send(
        emailjsServiceId,
        emailjsTemplateId,
        templateParams,
        emailjsPublicKey
      );

      console.log("✅ Email enviado automaticamente com sucesso:", response);
      return {
        success: true,
        message: `Email enviado automaticamente para ${email}. Verifique sua caixa de entrada e spam.`,
      };
    } catch (emailjsError: any) {
      console.error("❌ Erro ao enviar email via EmailJS:", emailjsError);
      
      let errorMsg = "Erro ao enviar email automaticamente. Tente novamente mais tarde.";
      
      if (emailjsError.text) {
        errorMsg = `Erro: ${emailjsError.text}`;
      } else if (emailjsError.message) {
        errorMsg = `Erro: ${emailjsError.message}`;
      }
      
      return {
        success: false,
        message: errorMsg,
      };
    }
  } catch (error: any) {
    console.error("❌ Erro ao enviar email:", error);
    
    let errorMessage = "Erro ao processar recuperação de senha. Tente novamente.";
    
    if (error.message) {
      errorMessage = `Erro: ${error.message}`;
    }
    
    return {
      success: false,
      message: errorMessage,
    };
  }
}

/**
 * Carrega o script do EmailJS dinamicamente
 */
function loadEmailJSScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    // Verificar se já está carregado
    if (window.emailjs) {
      resolve();
      return;
    }

    // Verificar se o script já está sendo carregado
    if (document.querySelector('script[src*="emailjs"]')) {
      const checkInterval = setInterval(() => {
        if (window.emailjs) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 100);
      return;
    }

    // Carregar script
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";
    script.async = true;
    script.onload = () => {
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;
      if (publicKey && window.emailjs) {
        window.emailjs.init(publicKey);
      }
      resolve();
    };
    script.onerror = () => {
      reject(new Error("Falha ao carregar EmailJS"));
    };
    document.head.appendChild(script);
  });
}
