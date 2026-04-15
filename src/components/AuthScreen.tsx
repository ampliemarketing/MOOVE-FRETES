import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import {
  Truck,
  Package,
  Building,
  Eye,
  EyeOff,
  Mail,
  Lock,
  UserPlus,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { RegistrationFlow } from "./RegistrationFlow";
import { DatabaseErrorAlert } from "./DatabaseErrorAlert";
import { EmailNotConfirmedAlert } from "./EmailNotConfirmedAlert";
import {
  supabase,
  getSupabaseClient,
} from "../utils/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import logoMaisFrete from "../assets/logo-moovefretes.png";

// 🔑 Chave para armazenar o último email logado
const LAST_LOGGED_EMAIL_KEY = "maisfrete_last_logged_email";

interface AuthScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

type ViewMode = "auth" | "register" | "registration-flow";

export function AuthScreen({ onLogin }: AuthScreenProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("auth");
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "checking" | "connected" | "error"
  >("checking");
  const [selectedUserType, setSelectedUserType] = useState<
    "caminhoneiro" | "transportadora" | "agenciador" | null
  >(null);
  const [registeredUserId, setRegisteredUserId] = useState<string | null>(null);
  const [showDatabaseError, setShowDatabaseError] =
    useState(false);
  const [
    showEmailNotConfirmedError,
    setShowEmailNotConfirmedError,
  ] = useState(false);
  const [showPasswordResetModal, setShowPasswordResetModal] =
    useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    name: "",
    userType: "caminhoneiro",
  });

  // Check Supabase connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      console.log(
        "🔧 Sistema: Supabase Auth + LocalStorage Data",
      );
      console.log("💾 Autenticação: Supabase");
      console.log("💾 Dados: LocalStorage");
      setConnectionStatus("connected");
    };

    checkConnection();
  }, []);

  // 🔑 Carregar último email logado ao montar o componente
  useEffect(() => {
    try {
      const savedEmail = localStorage.getItem(
        LAST_LOGGED_EMAIL_KEY,
      );
      if (savedEmail) {
        setFormData((prev) => ({ ...prev, email: savedEmail }));
        console.log("✅ Email anterior carregado:", savedEmail);
      }
    } catch (error) {
      console.error("❌ Erro ao carregar email salvo:", error);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log("🔐 AuthScreen - Iniciando login...");
    console.log("📧 Email:", formData.email);
    console.log(
      "🔑 Password length:",
      formData.password.length,
    );

    try {
      // Validação básica
      if (!formData.email || !formData.email.trim()) {
        toast.error("Por favor, insira um email");
        setLoading(false);
        return;
      }

      if (!formData.password || !formData.password.trim()) {
        toast.error("Por favor, insira uma senha");
        setLoading(false);
        return;
      }

      if (!formData.email.includes("@")) {
        toast.error("Por favor, insira um email válido");
        setLoading(false);
        return;
      }

      if (formData.password.length < 8) {
        toast.error("A senha deve ter no mínimo 8 caracteres");
        setLoading(false);
        return;
      }

      await onLogin(
        formData.email.trim(),
        formData.password.trim(),
      );
      console.log("✅ AuthScreen - Login bem-sucedido!");

      // 🔑 Salvar email do último usuário logado
      try {
        localStorage.setItem(
          LAST_LOGGED_EMAIL_KEY,
          formData.email.trim(),
        );
        console.log(
          "💾 Email salvo para próximo login:",
          formData.email.trim(),
        );
      } catch (saveError) {
        console.error("❌ Erro ao salvar email:", saveError);
        // Não bloquear o login se houver erro ao salvar
      }

      toast.success(`Bem-vindo ao MooveFretes!`);
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erro ao fazer login";
      console.error("❌ AuthScreen - Login error:", error);

      // 🧹 LIMPAR QUALQUER SESSÃO ANTERIOR EM CASO DE ERRO
      console.log(
        "🧹 AuthScreen - Garantindo que não há sessão residual...",
      );
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.log("ℹ️ Não havia sessão para limpar");
      }

      // 🔍 Diagnóstico avançado do erro
      console.log("");
      console.log("━".repeat(60));
      console.log("🔍 DIAGNÓSTICO DE ERRO DE LOGIN");
      console.log("━".repeat(60));
      console.log("📧 Email tentado:", formData.email);
      console.log("📝 Mensagem de erro:", errorMessage);

      // Verificar se há dados locais para este email
      const localUsers = Object.keys(localStorage)
        .filter(
          (key) => key.startsWith("users_") || key === "users",
        )
        .map((key) => {
          try {
            const data = JSON.parse(
              localStorage.getItem(key) || "[]",
            );
            return Array.isArray(data) ? data : [data];
          } catch {
            return [];
          }
        })
        .flat()
        .filter(
          (user) => user && user.email === formData.email,
        );

      if (localUsers.length > 0) {
        console.log(
          "⚠️ Usuário encontrado no LocalStorage mas NÃO no Supabase Auth",
        );
        console.log(
          "💡 Isso significa que o usuário foi criado apenas localmente (modo demo antigo)",
        );
        console.log(
          "✅ SOLUÇÃO: Criar uma nova conta no sistema atual (Supabase Auth)",
        );
      } else {
        console.log(
          "ℹ️ Usuário não encontrado no LocalStorage",
        );
        console.log(
          "💡 Email/senha podem estar incorretos ou conta não existe",
        );
      }
      console.log("━".repeat(60));
      console.log("");

      // Show more helpful message for email confirmation error
      if (
        errorMessage.includes("Email not confirmed") ||
        errorMessage.includes("not confirmed")
      ) {
        toast.error(
          'Email não confirmado. Clique no botão "🚨 Corrigir Email" abaixo!',
          { duration: 8000 },
        );
        setShowEmailNotConfirmedError(true); // Show the fix instructions
      } else if (
        errorMessage.includes("Invalid login credentials")
      ) {
        // Mensagem específica baseada no diagnóstico
        if (localUsers.length > 0) {
          console.log("");
          console.log(
            "🚨 PROBLEMA IDENTIFICADO: Conta antiga (apenas LocalStorage)",
          );
          console.log("");
          toast.error("Conta não encontrada no sistema atual", {
            description:
              'Esta conta é do sistema antigo. Por favor, crie uma nova conta clicando em "Criar Conta" abaixo.',
            duration: 10000,
          });
        } else {
          toast.error("Email ou senha incorretos", {
            description:
              "Verifique suas credenciais ou crie uma nova conta se ainda não tem cadastro.",
            duration: 8000,
          });
        }
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Demo login removed - users must create accounts

  // QuickRegistration removido - agora tudo é feito no fluxo unificado

  // Fluxo antigo (manter para compatibilidade)
  const handleStartRegistration = (
    userType: "caminhoneiro" | "transportadora",
  ) => {
    setSelectedUserType(userType);
    setViewMode("registration-flow");
  };

  // Skip first declaration - handleRegistrationComplete_DUPLICATE removed
  // (Real implementation is around line 1086)
  
  const handleRegistrationComplete_REMOVED_DUPLICATE = async (userData: any) => {
    console.log(
      "📝 AuthScreen.handleRegistrationComplete - Criando usuário no Supabase e banco local",
    );
    console.log("📦 userData recebido:", {
      email: userData.email,
      hasPassword: !!userData.password,
      userType: userData.userType,
      nome: userData.nome,
      userId: userData.userId, // ✅ NOVO
      avatarPath: userData.avatarPath, // ✅ NOVO
    });

    try {
      // ✅ DECLARAR VARIÁVEIS GLOBAIS (usadas por ambos os fluxos)
      let authData: any;
      let avatarPath: string | undefined = undefined;
      let documentPaths: Record<string, string> = {};

      // ════════════════════════════════════════════════════════════
      // PARTE 1: CRIAR/OBTER AUTH USER E FAZER UPLOADS
      // ════════════════════════════════════════════════════════════

      if (userData.userId) {
        // ✅ NOVO FLUXO: Auth User JÁ FOI CRIADO na CredentialsRegistration!
        console.log("");
        console.log(
          "═══════════════════════════════════════════════════════════",
        );
        console.log("✅ NOVO FLUXO - Auth User JÁ CRIADO!");
        console.log(
          "═══════════════════════════════════════════════════════════",
        );
        console.log("🆔 User ID:", userData.userId);
        console.log("📧 Email:", userData.email);
        console.log(
          "📸 Avatar Path:",
          userData.avatarPath || "nenhum",
        );
        console.log("");

        // Criar objeto authData compatível
        authData = {
          user: {
            id: userData.userId,
            email: userData.email,
          },
          session: null, // Sessão já existe
        };

        // ✅ Usar avatarPath que já foi uploadado
        avatarPath = userData.avatarPath || undefined;

        console.log(
          "⏩ Pulando verificação de email, signUp e upload de avatar",
        );
        console.log(
          "✅ Usando avatarPath existente:",
          avatarPath || "nenhum",
        );
        console.log("");
      } else {
        // ⚠️ FLUXO ANTIGO: Criar Auth User agora
        console.log("");
        console.log(
          "⚠️ FLUXO ANTIGO - Criando Auth User agora",
        );
        console.log("");

        // Step 1: Verificar se email já existe no banco de dados
        console.log(
          "🔍 Verificando se email já existe no banco...",
        );

        const { data: existingProfile, error: checkError } =
          await supabase
            .from("profiles")
            .select("id, email")
            .eq("email", userData.email.toLowerCase())
            .maybeSingle();

        if (checkError && checkError.code !== "PGRST116") {
          console.error(
            "❌ Erro ao verificar email:",
            checkError,
          );
          throw new Error(
            "Erro ao verificar disponibilidade do email",
          );
        }

        if (existingProfile) {
          console.error(
            "❌ Email já existe no banco:",
            existingProfile,
          );
          throw new Error(
            "Este email já está cadastrado. Faça login ou use outro email.",
          );
        }

        console.log(
          "✅ Email disponível - prosseguindo com criação...",
        );

        // Step 2: Create user in Supabase Auth
        console.log("✅ Criando usuário no Supabase Auth...");

        const { data: signUpData, error: authError } =
          await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
              data: {
                name:
                  userData.nome ||
                  userData.nomeEmpresa ||
                  userData.razaoSocial ||
                  "Novo Usuário",
                user_type:
                  userData.userType ||
                  selectedUserType ||
                  "caminhoneiro",
              },
            },
          });

        authData = signUpData;

        if (authError) {
          console.error("❌ Erro no Supabase Auth:", authError);

          // Mensagem de erro mais clara para database error
          if (
            authError.message &&
            authError.message.includes("Database error")
          ) {
            setShowDatabaseError(true);

            console.log("");
            console.log(
              "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            );
            console.error(
              "🚨 ERRO DE BANCO DE DADOS DETECTADO",
            );
            console.log(
              "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            );
            console.log("");
            console.log(
              '❌ PROBLEMA: A tabela "profiles" não existe no Supabase',
            );
            console.log("");
            console.log("✅ SOLUÇÃO:");
            console.log(
              "   1. Abra: https://supabase.com/dashboard/project/urnfkafgauftssvkwffd/sql/new",
            );
            console.log(
              "   2. Copie TODO o SQL do arquivo: /COPIE_E_COLE_ESTE_SQL.txt",
            );
            console.log(
              '   3. Cole no SQL Editor e clique "Run"',
            );
            console.log("   4. Recarregue esta página (F5)");
            console.log("");
            console.log("📚 GUIAS DISPONÍVEIS:");
            console.log(
              "   • /README_ERRO_DATABASE_SOLUCAO_RAPIDA.md",
            );
            console.log("   • /EXECUTAR_SQL_AGORA.md");
            console.log("   • /COPIE_E_COLE_ESTE_SQL.txt");
            console.log("");
            console.log(
              "💡 Um alerta visual foi exibido na tela com instruções.",
            );
            console.log("");
            console.log(
              "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            );
            console.log("");

            throw new Error(
              '❌ ERRO: Tabela "profiles" não existe no Supabase!\n\n' +
                "🔧 SOLUÇÃO:\n" +
                "1. Abra: https://supabase.com/dashboard\n" +
                "2. Vá para SQL Editor\n" +
                "3. Execute o SQL do arquivo: /COPIE_E_COLE_ESTE_SQL.txt\n\n" +
                "Veja instruções em: /EXECUTAR_SQL_AGORA.md",
            );
          }

          throw new Error(authError.message);
        }

        if (!authData.user) {
          throw new Error(
            "Usuário não foi criado no Supabase Auth",
          );
        }

        console.log(
          "✅ User created in Supabase Auth:",
          authData.user.email,
        );

        // ⏱️ Aguardar sessão estar completamente ativa
        console.log(
          "⏱️ Aguardando sessão estar ativa para uploads...",
        );
        await new Promise((resolve) =>
          setTimeout(resolve, 300),
        ); // 300ms

        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          console.warn(
            "⚠️ Sessão não detectada após signUp - continuando mesmo assim",
          );
        } else {
          console.log(
            "✅ Sessão ativa confirmada - prosseguindo com uploads",
          );
        }

        // ✅ UPLOAD DE DOCUMENTOS E AVATAR
        console.log("");
        console.log(
          "═══════════════════════════════════════════════════════════",
        );
        console.log(
          "📤 AuthScreen - Upload de documentos e avatar",
        );
        console.log(
          "═══════════════════════════════════════════════════════════",
        );
        console.log("");

        // Upload do avatar (se houver)
        if (userData.profilePhoto) {
          console.log("📸 Upload do avatar detectado...");
          try {
            const { uploadAvatar } = await import(
              "../utils/storage-helper"
            );
            const result = await uploadAvatar(
              authData.user.id,
              userData.profilePhoto,
            );

            if (result.success && result.path) {
              avatarPath = result.path; // ✅ PATH, não URL!
              console.log("✅ Avatar uploadado:", avatarPath);
            } else {
              console.error(
                "❌ Erro ao fazer upload do avatar:",
                result.error,
              );
              toast.error(
                "Erro ao fazer upload da foto de perfil",
              );
            }
          } catch (error) {
            console.error(
              "❌ Exceção ao fazer upload do avatar:",
              error,
            );
            toast.error("Erro ao processar foto de perfil");
          }
        }

        // Upload dos documentos (se houver)
        if (
          userData.uploads &&
          Object.keys(userData.uploads).length > 0
        ) {
          console.log(
            `📄 Upload de ${Object.keys(userData.uploads).length} documentos detectado...`,
          );
          try {
            const { uploadDocuments } = await import(
              "../utils/storage-helper"
            );
            const result = await uploadDocuments(
              authData.user.id,
              userData.uploads,
            );

            if (result.success && result.paths) {
              documentPaths = result.paths; // ✅ PATHS, não URLs!
              console.log(
                `✅ ${Object.keys(documentPaths).length} documentos uploadados com sucesso`,
              );
              console.log(
                "📋 Paths salvos:",
                Object.keys(documentPaths),
              );
            } else {
              console.error(
                "❌ Erro ao fazer upload dos documentos:",
                result.error,
              );
              toast.error(
                "Erro ao fazer upload dos documentos",
              );
            }
          } catch (error) {
            console.error(
              "❌ Exceção ao fazer upload dos documentos:",
              error,
            );
            toast.error("Erro ao processar documentos");
          }
        }

        console.log("");
        console.log(
          "═══════════════════════════════════════════════════════════",
        );
        console.log("");
      }

      // ════════════════════════════════════════════════════════════
      // PARTE 2: SALVAR PERFIL (SEMPRE RODA!)
      // ════════════════════════════════════════════════════════════

      console.log("");
      console.log(
        "═══════════════════════════════════════════════════════════",
      );
      console.log(
        "💾 SALVANDO PERFIL NO BANCO (todos os fluxos)",
      );
      console.log(
        "═══════════════════════════════════════════════════════════",
      );
      console.log("");

      // Step 3: Create user in local database
      const { database } = await import("../utils/database");

      const newUser = await database.users.create({
        id: authData.user.id,
        email: userData.email,
        userType:
          userData.userType ||
          selectedUserType ||
          "caminhoneiro",
        name:
          userData.nome ||
          userData.nomeEmpresa ||
          userData.razaoSocial ||
          "Novo Usuário",
        phone: userData.telefone || userData.celular || "",
        cpf: userData.cpf || userData.cpfPrincipal || "",
        cnpj: userData.cnpj || "",
        profile: {
          avatar: avatarPath || "",
          bio: "",
          rating: 0,
          totalFreights: 0,
          completedFreights: 0,
          verificationStatus: "verified",
        },
        gamification: {
          level: 1,
          xp: 0,
          badges: [],
          achievements: [],
        },
        preferences: {
          notifications: true,
          emailAlerts: true,
        },
      });

      if (!newUser.success || !newUser.data) {
        throw new Error(
          "Falha ao criar usuário no database local",
        );
      }

      console.log(
        "✅ User created in local database:",
        newUser.data.email,
      );

      // 🔄 Sincronizar perfil com Supabase
      console.log("");
      console.log(
        "═══════════════════════════════════════════════════════════",
      );
      console.log(
        "🔄 AuthScreen - Sincronizando perfil com Supabase",
      );
      console.log(
        "═══════════════════════════════════════════════════════════",
      );
      console.log("");

      try {
        const supabase = getSupabaseClient();

        const profilePayload = {
          id: authData.user.id,
          email: userData.email,
          user_type:
            userData.userType ||
            selectedUserType ||
            "caminhoneiro",
          name:
            userData.nome ||
            userData.nomeEmpresa ||
            userData.razaoSocial ||
            "Novo Usuário",
          phone: userData.telefone || userData.celular || "",
          cpf: userData.cpf || userData.cpfPrincipal || "",
          cnpj: userData.cnpj || "",
          city: userData.cidade || "",
          state: userData.estado || "",
          avatar_url: avatarPath || "",
          bio: "",
          rating: 0,
          total_freights: 0,
          completed_freights: 0,
          verification_status: "verified",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        console.log("📤 Enviando perfil para Supabase:", {
          id: profilePayload.id,
          email: profilePayload.email,
          user_type: profilePayload.user_type,
          name: profilePayload.name,
          avatar_url: profilePayload.avatar_url,
        });

        const { data: profileData, error: profileError } =
          await supabase
            .from("profiles")
            .upsert(profilePayload, {
              onConflict: "id",
            });

        if (profileError) {
          console.error(
            "❌ Erro ao sincronizar perfil com Supabase:",
            profileError,
          );
        } else {
          console.log(
            "✅ Perfil sincronizado com Supabase com sucesso!",
          );
        }
      } catch (syncError) {
        console.error(
          "❌ Erro ao sincronizar perfil:",
          syncError,
        );
      }

      console.log("");
      console.log(
        "═══════════════════════════════════════════════════════════",
      );
      console.log("");

      // ════════════════════════════════════════════════════════════
      // PARTE 3: SALVAR EMPRESA (se transportadora/agenciador)
      // ════════════════════════════════════════════════════════════

      if (
        userData.userType === "transportadora" ||
        userData.userType === "agenciador"
      ) {
        console.log("");
        console.log(
          "═══════════════════════════════════════════════════════════",
        );
        console.log(
          "🏢 AuthScreen - Criando registro da empresa",
        );
        console.log(
          "═══════════════════════════════════════════════════════════",
        );
        console.log("");

        const companyData = {
          userId: authData.user.id,
          name:
            userData.nomeFantasia ||
            userData.razaoSocial ||
            userData.nomeEmpresa ||
            "Empresa",
          companyName:
            userData.razaoSocial ||
            userData.nomeFantasia ||
            userData.nomeEmpresa ||
            "Empresa",
          type: userData.userType as
            | "transportadora"
            | "agenciador",
          businessType: userData.userType as
            | "transportadora"
            | "agenciador",
          cnpj: userData.cnpj || "",
          phone: userData.telefone || userData.celular || "",
          email:
            userData.emailCorporativo || userData.email || "",
          corporateEmail:
            userData.emailCorporativo || userData.email || "",
          description: userData.bio || "",
          stateRegistration: userData.inscricaoEstadual || "",
          municipalRegistration:
            userData.inscricaoMunicipal || "",
          representativeName: userData.nomeRepresentante || "",
          representativeCpf: userData.cpfRepresentante || "",
          representativeRg: userData.rgRepresentante || "",
          representativePhone:
            userData.telefoneRepresentante || "",
          representativeEmail:
            userData.emailRepresentante || "",
          representativeRole: userData.tipoVinculo || "",
          representativeCnh: userData.cnhRepresentante || "",
          rntrc: userData.rntrc || "",
          rntrcExpiry: userData.validadeRNTRC || "",
          isIndividual: userData.isPessoaFisica || false,
          mainCpf: userData.cpfPrincipal || "",
          address: {
            cep: userData.cep || "",
            street: userData.endereco || "",
            number: userData.numero || "",
            complement: userData.complemento || "",
            neighborhood: userData.bairro || "",
            city: userData.cidade || "",
            state: userData.estado || "",
          },
          contact: {
            email:
              userData.emailCorporativo || userData.email || "",
            phone: userData.telefone || userData.celular || "",
            website: userData.website || "",
          },
          verificationStatus: "verified" as const,
          documents: {
            cnpjDocument: "",
            contractSocial: "",
            proofOfAddress: "",
          },
        };

        console.log("📤 Salvando empresa no banco...");
        const companyResult =
          await database.companies.create(companyData);

        if (companyResult.success) {
          console.log(
            "✅ Empresa criada com sucesso:",
            companyResult.data?.name,
          );

          // Sincronizar com Supabase
          try {
            const { syncCompanyToSupabase } = await import(
              "../utils/supabase-sync"
            );
            const companyWithUserId = {
              ...companyResult.data,
              userId: authData.user.id,
            };
            const syncResult = await syncCompanyToSupabase(
              companyWithUserId,
            );

            if (syncResult.success) {
              console.log(
                "✅ Empresa sincronizada com Supabase!",
              );
            }
          } catch (syncError) {
            console.warn(
              "⚠️ Erro ao sincronizar empresa:",
              syncError,
            );
          }
        } else {
          console.error(
            "❌ Erro ao criar empresa:",
            companyResult.error,
          );
        }

        console.log("");
        console.log(
          "═══════════════════════════════════════════════════════════",
        );
        console.log("");
      }

      // ════════════════════════════════════════════════════════════
      // PARTE 4: SALVAR DRIVER (se caminhoneiro)
      // ════════════════════════════════════════════════════════════

      if (userData.userType === "caminhoneiro") {
        console.log("");
        console.log(
          "═══════════════════════════════════════════════════════════",
        );
        console.log(
          "🚚 AuthScreen - Criando registro do motorista",
        );
        console.log(
          "═══════════════════════════════════════════════════════════",
        );
        console.log("");

        const driverData = {
          userId: authData.user.id,
          name: userData.nome || "Motorista",
          cpf: userData.cpf || "",
          rg: userData.rg || "",
          birthDate: userData.dataNascimento || "",
          cnh: userData.cnh || "",
          cnhCategory: userData.categoriaCNH || "",
          cnhValidity: userData.validadeCNH || "",
          rntrc: userData.rntrc || "",
          rntrcExpiry: userData.validadeRNTRC || "",
          phone: userData.telefone || userData.celular || "",
          address: {
            cep: userData.cep || "",
            street: userData.endereco || "",
            number: userData.numero || "",
            complement: userData.complemento || "",
            neighborhood: userData.bairro || "",
            city: userData.cidade || "",
            state: userData.estado || "",
          },
          vehiclePlate: userData.placaVeiculo || "",
          vehicleModel: userData.marcaModelo || "",
          vehicleYear: userData.anoVeiculo || "",
          renavam: userData.renavam || "",
          anttVehicle: userData.anttVeiculo || "",
          vehicleTypes: userData.tiposVeiculos || [],
          bodyTypes: userData.tiposCarrocerias || [],
          vehicleCapacity: userData.capacidadeVeiculo || 0,
          vehicle: {
            type:
              userData.tiposVeiculos?.[0] ||
              userData.tipoVeiculo ||
              "",
            plate: userData.placaVeiculo || "",
            model:
              userData.marcaModelo ||
              userData.modeloVeiculo ||
              "",
            year: userData.anoVeiculo || "",
            capacity:
              userData.capacidadeVeiculo?.toString() || "0",
          },
          profileImage: avatarPath || "",
          documentPaths:
            documentPaths &&
            Object.keys(documentPaths).length > 0
              ? documentPaths
              : null,
          status: "available" as const,
          rating: 0,
          totalTrips: 0,
          completedTrips: 0,
        };

        console.log("📤 Salvando motorista no banco...");
        const driverResult =
          await database.drivers.create(driverData);

        if (driverResult.success) {
          console.log(
            "✅ Motorista criado com sucesso:",
            driverResult.data?.name,
          );

          // Sincronizar com Supabase
          try {
            const { syncDriverToSupabase } = await import(
              "../utils/supabase-sync"
            );
            const driverWithUserId = {
              ...driverResult.data,
              userId: authData.user.id,
            };
            const syncResult =
              await syncDriverToSupabase(driverWithUserId);

            if (syncResult.success) {
              console.log(
                "✅ Motorista sincronizado com Supabase!",
              );
            }
          } catch (syncError) {
            console.warn(
              "⚠️ Erro ao sincronizar motorista:",
              syncError,
            );
          }
        } else {
          console.error(
            "❌ Erro ao criar motorista:",
            driverResult.error,
          );
        }

        console.log("");
        console.log(
          "═══════════════════════════════════════════════════════════",
        );
        console.log("");
      }

      // ════════════════════════════════════════════════════════════
      // PARTE 5: VERIFICAR CONVITES E CRIAR SUPER ADMIN
      // ════════════════════════════════════════════════════════════

      const {
        checkPendingInvite,
        acceptInviteAfterRegistration,
        createSuperAdminOnRegistration,
      } = await import("../utils/collaborator-helpers");

      const inviteCheck = await checkPendingInvite(
        userData.email,
      );
      if (inviteCheck.hasPendingInvite && inviteCheck.invite) {
        console.log(
          "📧 Convite pendente detectado - aceitando automaticamente...",
        );

        const acceptResult =
          await acceptInviteAfterRegistration(
            inviteCheck.invite,
            authData.user.id,
            authData.session?.access_token,
          );

        if (acceptResult.success) {
          toast.success(
            "Cadastro realizado e convite aceito com sucesso!",
          );
        } else {
          console.warn(
            "⚠️ Erro ao aceitar convite:",
            acceptResult.error,
          );
          toast.success("Cadastro realizado com sucesso!");
        }
      } else {
        // Criar Super Admin se user é transportadora ou agenciador
        if (
          userData.userType === "transportadora" ||
          userData.userType === "agenciador"
        ) {
          console.log(
            "🔐 Criando Super Admin automaticamente...",
          );

          const adminResult =
            await createSuperAdminOnRegistration(
              newUser.data,
              authData.user.id,
              authData.session?.access_token,
            );

          if (adminResult.success) {
            console.log("✅ Super Admin criado com sucesso!");
            toast.success(
              "Cadastro realizado e perfil de administrador configurado!",
            );
          } else {
            console.warn(
              "⚠️ Erro ao criar Super Admin:",
              adminResult.error,
            );
            toast.success("Cadastro realizado com sucesso!");
          }
        } else {
          toast.success("Cadastro realizado com sucesso!");
        }
      }

      // ════════════════════════════════════════════════════════════
      // PARTE 6: AUTO-LOGIN
      // ════════════════════════════════════════════════════════════

      await onLogin(userData.email, userData.password);
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erro ao criar conta. Tente novamente.";
      toast.error(errorMessage);
    }
  };

  const handleRegistrationComplete = async (userData: any) => {
    console.log(
      "📝 AuthScreen.handleRegistrationComplete - Criando usuário no Supabase e banco local",
    );
    console.log("📦 userData recebido:", {
      email: userData.email,
      hasPassword: !!userData.password,
      userType: userData.userType,
      nome: userData.nome,
      userId: userData.userId, // ✅ NOVO
      avatarPath: userData.avatarPath, // ✅ NOVO
    });

    try {
      // ✅ VERIFICAR SE AUTH USER JÁ FOI CRIADO (nova arquitetura)
      let authData: any;
      let authUserId: string;

      if (userData.userId) {
        // ✅ Auth User JÁ FOI CRIADO na CredentialsRegistration!
        console.log("");
        console.log(
          "═══════════════════════════════════════════════════════════",
        );
        console.log(
          "✅ Auth User JÁ FOI CRIADO na CredentialsRegistration!",
        );
        console.log(
          "═══════════════════════════════════════════════════════════",
        );
        console.log("🆔 User ID:", userData.userId);
        console.log("📧 Email:", userData.email);
        console.log(
          "📸 Avatar Path:",
          userData.avatarPath || "nenhum",
        );
        console.log("");

        authUserId = userData.userId;

        // Criar objeto authData compatível
        authData = {
          user: {
            id: userData.userId,
            email: userData.email,
          },
          session: null, // Sessão já existe
        };

        // Pular etapas de verificação e signUp (já foram feitas!)
        console.log(
          "⏩ Pulando verificação de email e signUp (já foram feitos)",
        );
        console.log("");
      } else {
        // ⚠️ FALLBACK: Fluxo antigo - verificar email e criar Auth User agora
        console.log("");
        console.log(
          "⚠️ userId NÃO encontrado - usando fluxo antigo (criar agora)",
        );
        console.log("");

        // Step 1: Verificar se email já existe no banco de dados
        console.log(
          "🔍 Verificando se email já existe no banco...",
        );

        const { data: existingProfile, error: checkError } =
          await supabase
            .from("profiles")
            .select("id, email")
            .eq("email", userData.email.toLowerCase())
            .maybeSingle();

        if (checkError && checkError.code !== "PGRST116") {
          console.error(
            "❌ Erro ao verificar email:",
            checkError,
          );
          throw new Error(
            "Erro ao verificar disponibilidade do email",
          );
        }

        if (existingProfile) {
          console.error(
            "❌ Email já existe no banco:",
            existingProfile,
          );
          throw new Error(
            "Este email já está cadastrado. Faça login ou use outro email.",
          );
        }

        console.log(
          "✅ Email disponível - prosseguindo com criação...",
        );

        // Step 2: Create user in Supabase Auth
        console.log("✅ Criando usuário no Supabase Auth...");

        const { data: signUpData, error: authError } =
          await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
              data: {
                name:
                  userData.nome ||
                  userData.nomeEmpresa ||
                  userData.razaoSocial ||
                  "Novo Usuário",
                user_type:
                  userData.userType ||
                  selectedUserType ||
                  "caminhoneiro",
              },
            },
          });

        authData = signUpData;
        authUserId = authData?.user?.id;

        if (authError) {
          console.error("❌ Erro no Supabase Auth:", authError);

          // Mensagem de erro mais clara para database error
          if (
            authError.message &&
            authError.message.includes("Database error")
          ) {
            // Mostrar alerta visual
            setShowDatabaseError(true);

            // Logs mais claros no console
            console.log("");
            console.log(
              "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            );
            console.error(
              "🚨 ERRO DE BANCO DE DADOS DETECTADO",
            );
            console.log(
              "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            );
            console.log("");
            console.log(
              '❌ PROBLEMA: A tabela "profiles" não existe no Supabase',
            );
            console.log("");
            console.log("✅ SOLUÇÃO:");
            console.log(
              "   1. Abra: https://supabase.com/dashboard/project/urnfkafgauftssvkwffd/sql/new",
            );
            console.log(
              "   2. Copie TODO o SQL do arquivo: /COPIE_E_COLE_ESTE_SQL.txt",
            );
            console.log(
              '   3. Cole no SQL Editor e clique "Run"',
            );
            console.log("   4. Recarregue esta página (F5)");
            console.log("");
            console.log("📚 GUIAS DISPONÍVEIS:");
            console.log(
              "   • /README_ERRO_DATABASE_SOLUCAO_RAPIDA.md",
            );
            console.log("   • /EXECUTAR_SQL_AGORA.md");
            console.log("   • /COPIE_E_COLE_ESTE_SQL.txt");
            console.log("");
            console.log(
              "💡 Um alerta visual foi exibido na tela com instruções.",
            );
            console.log("");
            console.log(
              "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
            );
            console.log("");

            throw new Error(
              '❌ ERRO: Tabela "profiles" não existe no Supabase!\n\n' +
                "🔧 SOLUÇÃO:\n" +
                "1. Abra: https://supabase.com/dashboard\n" +
                "2. Vá para SQL Editor\n" +
                "3. Execute o SQL do arquivo: /COPIE_E_COLE_ESTE_SQL.txt\n\n" +
                "Veja instruções em: /EXECUTAR_SQL_AGORA.md",
            );
          }

          throw new Error(authError.message);
        }

        if (!authData.user) {
          throw new Error(
            "Usuário não foi criado no Supabase Auth",
          );
        }

        console.log(
          "✅ User created in Supabase Auth:",
          authData.user.email,
        );

        // ⏱️ CORREÇÃO ERRO #1: Aguardar sessão estar completamente ativa
        // O signUp retorna os dados, mas a sessão JWT pode não estar propagada para RLS
        console.log(
          "⏱️ Aguardando sessão estar ativa para uploads...",
        );
        await new Promise((resolve) =>
          setTimeout(resolve, 300),
        ); // 300ms

        // Verificar se sessão está disponível
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          console.warn(
            "⚠️ Sessão não detectada após signUp - continuando mesmo assim",
          );
        } else {
          console.log(
            "✅ Sessão ativa confirmada - prosseguindo com uploads",
          );
        }

        // ✅ Step 2.5: UPLOAD DE DOCUMENTOS E AVATAR (AGORA COM USUÁRIO AUTENTICADO!)
        console.log("");
        console.log(
          "═══════════════════════════════════════════════════════════",
        );
        console.log(
          "📤 AuthScreen - Upload de documentos e avatar",
        );
        console.log(
          "��══════════════════════════════════════════════════════════",
        );
        console.log("");

        let avatarPath: string | undefined = undefined;
        let documentPaths: Record<string, string> = {};

        // Upload do avatar (se houver)
        if (userData.profilePhoto) {
          console.log("📸 Upload do avatar detectado...");
          try {
            const { uploadAvatar } = await import(
              "../utils/storage-helper"
            );
            const result = await uploadAvatar(
              authData.user.id,
              userData.profilePhoto,
            );

            if (result.success && result.path) {
              avatarPath = result.path; // ✅ PATH, não URL!
              console.log("✅ Avatar uploadado:", avatarPath);
            } else {
              console.error(
                "❌ Erro ao fazer upload do avatar:",
                result.error,
              );
              toast.error(
                "Erro ao fazer upload da foto de perfil",
              );
            }
          } catch (error) {
            console.error(
              "❌ Exceção ao fazer upload do avatar:",
              error,
            );
            toast.error("Erro ao processar foto de perfil");
          }
        }

        // Upload dos documentos (se houver)
        if (
          userData.uploads &&
          Object.keys(userData.uploads).length > 0
        ) {
          console.log(
            `📄 Upload de ${Object.keys(userData.uploads).length} documentos detectado...`,
          );
          try {
            const { uploadDocuments } = await import(
              "../utils/storage-helper"
            );
            const result = await uploadDocuments(
              authData.user.id,
              userData.uploads,
            );

            if (result.success && result.paths) {
              documentPaths = result.paths; // ✅ PATHS, não URLs!
              console.log(
                `✅ ${Object.keys(documentPaths).length} documentos uploadados com sucesso`,
              );
              console.log(
                "📋 Paths salvos:",
                Object.keys(documentPaths),
              );
            } else {
              console.error(
                "❌ Erro ao fazer upload dos documentos:",
                result.error,
              );
              toast.error(
                "Erro ao fazer upload dos documentos",
              );
              // ⚠️ Não interromper - continuar mesmo se documentos falharem
            }
          } catch (error) {
            console.error(
              "❌ Exceção ao fazer upload dos documentos:",
              error,
            );
            toast.error("Erro ao processar documentos");
            // ⚠️ Não interromper - continuar mesmo se documentos falharem
          }
        }

        console.log("");
        console.log(
          "═══════════════════════════════════════════════════════════",
        );
        console.log("");

        // Step 3: Create user in local database
        const { database } = await import("../utils/database");

        const newUser = await database.users.create({
          id: authData.user.id, // Use Supabase Auth user ID
          email: userData.email,
          userType:
            userData.userType ||
            selectedUserType ||
            "caminhoneiro",
          name:
            userData.nome ||
            userData.nomeEmpresa ||
            userData.razaoSocial ||
            "Novo Usuário",
          phone: userData.telefone || userData.celular || "",
          cpf: userData.cpf || userData.cpfPrincipal || "",
          cnpj: userData.cnpj || "",
          profile: {
            avatar: avatarPath || "", // ✅ PATH do Storage (não URL!)
            bio: "",
            rating: 0,
            totalFreights: 0,
            completedFreights: 0,
            verificationStatus: "verified", // Auto-verify new users in production
          },
          gamification: {
            level: 1,
            xp: 0,
            badges: [],
            achievements: [],
          },
          preferences: {
            notifications: true,
            emailAlerts: true,
          },
        });

        if (newUser.success && newUser.data) {
          console.log(
            "✅ User created in local database:",
            newUser.data.email,
          );

          // 🔄 Step 3.1: Sincronizar perfil do usuário com Supabase
          console.log("");
          console.log(
            "═══════════════════════════════════════════════════════════",
          );
          console.log(
            "🔄 AuthScreen - Sincronizando perfil com Supabase",
          );
          console.log(
            "═══════════════════════════════════════════════════════════",
          );
          console.log("");

          try {
            const supabase = getSupabaseClient();

            const profilePayload = {
              id: authData.user.id,
              email: userData.email,
              user_type:
                userData.userType ||
                selectedUserType ||
                "caminhoneiro",
              name:
                userData.nome ||
                userData.nomeEmpresa ||
                userData.razaoSocial ||
                "Novo Usuário",
              phone:
                userData.telefone || userData.celular || "",
              cpf: userData.cpf || userData.cpfPrincipal || "",
              cnpj: userData.cnpj || "",
              city: userData.cidade || "", // ✅ ADICIONADO: Cidade do endereço cadastral
              state: userData.estado || "", // ✅ ADICIONADO: Estado do endereço cadastral
              avatar_url: avatarPath || "",
              bio: "",
              rating: 0,
              total_freights: 0,
              completed_freights: 0,
              verification_status: "verified",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            console.log("📤 Enviando perfil para Supabase:", {
              id: profilePayload.id,
              email: profilePayload.email,
              user_type: profilePayload.user_type,
              name: profilePayload.name,
            });

            const { data: profileData, error: profileError } =
              await supabase
                .from("profiles")
                .upsert(profilePayload, {
                  onConflict: "id",
                });

            if (profileError) {
              console.error(
                "❌ Erro ao sincronizar perfil com Supabase:",
                profileError,
              );
              console.error("Detalhes do erro:", {
                message: profileError.message,
                code: profileError.code,
                details: profileError.details,
              });
            } else {
              console.log(
                "✅ Perfil sincronizado com Supabase com sucesso!",
              );
              console.log("📋 Dados salvos:", {
                user_type: profilePayload.user_type,
                name: profilePayload.name,
              });
            }

            // 🔄 TAMBÉM SALVAR NA TABELA USERS DO SUPABASE
            console.log(
              "📤 Salvando usuário na tabela users do Supabase...",
            );
            const userPayload = {
              id: authData.user.id,
              email: userData.email,
              user_type:
                userData.userType ||
                selectedUserType ||
                "caminhoneiro",
              name:
                userData.nome ||
                userData.nomeEmpresa ||
                userData.razaoSocial ||
                "Novo Usuário",
              phone:
                userData.telefone || userData.celular || "",
              cpf: userData.cpf || userData.cpfPrincipal || "",
              cnpj: userData.cnpj || "",
              avatar_url: avatarPath || "",
              bio: "",
              rating: 0,
              total_freights: 0,
              completed_freights: 0,
              verification_status: "verified",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };

            const { error: userError } = await supabase
              .from("profiles") // ✅ Mudado de 'users' para 'profiles'
              .upsert(userPayload, { onConflict: "id" });

            if (userError) {
              console.error(
                "❌ Erro ao salvar na tabela profiles:",
                userError,
              );
            } else {
              console.log(
                "✅ Usuário salvo na tabela profiles do Supabase!",
              );
            }
          } catch (syncError) {
            console.error(
              "❌ Erro ao sincronizar perfil:",
              syncError,
            );
            // Não interromper o fluxo se a sincronização falhar
          }

          console.log("");
          console.log(
            "═══════════════════════════════════════════════════════════",
          );
          console.log("");

          // 🏢 Step 3.5: Create company record for transportadora/agenciador
          if (
            userData.userType === "transportadora" ||
            userData.userType === "agenciador"
          ) {
            console.log("");
            console.log(
              "══════════════════════════════════════════════════════════",
            );
            console.log(
              "🏢 AuthScreen - Criando registro da empresa",
            );
            console.log(
              "═══════════════════════════════════════════════════════════",
            );
            console.log("");
            console.log("📋 userData completo recebido:", {
              razaoSocial: userData.razaoSocial,
              nomeFantasia: userData.nomeFantasia,
              nomeEmpresa: userData.nomeEmpresa,
              cnpj: userData.cnpj,
              telefone: userData.telefone,
              email: userData.email,
              emailCorporativo: userData.emailCorporativo,
              cep: userData.cep,
              endereco: userData.endereco,
              numero: userData.numero,
              complemento: userData.complemento,
              bairro: userData.bairro,
              cidade: userData.cidade,
              estado: userData.estado,
              inscricaoEstadual: userData.inscricaoEstadual,
              inscricaoMunicipal: userData.inscricaoMunicipal,
              allKeys: Object.keys(userData).join(", "),
            });
            console.log("");

            const companyData = {
              userId: authData.user.id,
              name:
                userData.nomeFantasia ||
                userData.razaoSocial ||
                userData.nomeEmpresa ||
                "Empresa",
              companyName:
                userData.razaoSocial ||
                userData.nomeFantasia ||
                userData.nomeEmpresa ||
                "Empresa",
              type: userData.userType as
                | "transportadora"
                | "agenciador",
              businessType: userData.userType as
                | "transportadora"
                | "agenciador",
              cnpj: userData.cnpj || "",
              phone:
                userData.telefone || userData.celular || "",
              email:
                userData.emailCorporativo ||
                userData.email ||
                "",
              corporateEmail:
                userData.emailCorporativo ||
                userData.email ||
                "",
              description: userData.bio || "",
              stateRegistration:
                userData.inscricaoEstadual || "",
              municipalRegistration:
                userData.inscricaoMunicipal || "",
              // Representante legal
              representativeName:
                userData.nomeRepresentante || "",
              representativeCpf:
                userData.cpfRepresentante || "",
              representativeRg: userData.rgRepresentante || "",
              representativePhone:
                userData.telefoneRepresentante || "",
              representativeEmail:
                userData.emailRepresentante || "",
              representativeRole: userData.tipoVinculo || "",
              representativeCnh:
                userData.cnhRepresentante || "",
              // Documentos específicos
              rntrc: userData.rntrc || "",
              rntrcExpiry: userData.validadeRNTRC || "",
              // Pessoa física (agenciador)
              isIndividual: userData.isPessoaFisica || false,
              mainCpf: userData.cpfPrincipal || "",
              address: {
                cep: userData.cep || "",
                street: userData.endereco || "",
                number: userData.numero || "",
                complement: userData.complemento || "",
                neighborhood: userData.bairro || "",
                city: userData.cidade || "",
                state: userData.estado || "",
              },
              contact: {
                email:
                  userData.emailCorporativo ||
                  userData.email ||
                  "",
                phone:
                  userData.telefone || userData.celular || "",
                website: userData.website || "",
              },
              verificationStatus: "verified" as const,
              documents: {
                cnpjDocument: "",
                contractSocial: "",
                proofOfAddress: "",
              },
            };

            console.log("📤 companyData que será salvo:", {
              userId: companyData.userId,
              name: companyData.name,
              companyName: companyData.companyName,
              cnpj: companyData.cnpj,
              phone: companyData.phone,
              email: companyData.email,
              address_street: companyData.address.street,
              address_city: companyData.address.city,
              address_state: companyData.address.state,
              stateRegistration: companyData.stateRegistration,
              municipalRegistration:
                companyData.municipalRegistration,
              representativeName:
                companyData.representativeName,
              representativeCpf: companyData.representativeCpf,
              rntrc: companyData.rntrc,
            });
            console.log("");

            const companyResult =
              await database.companies.create(companyData);

            if (companyResult.success) {
              console.log(
                "✅ Empresa criada com sucesso no LocalStorage:",
                {
                  id: companyResult.data?.id,
                  name: companyResult.data?.name,
                  companyName: companyResult.data?.companyName,
                  cnpj: companyResult.data?.cnpj,
                },
              );
              console.log("");

              // 🔄 Sincronizar empresa com Supabase
              try {
                console.log(
                  "🔄 Sincronizando empresa com Supabase...",
                );
                const { syncCompanyToSupabase } = await import(
                  "../utils/supabase-sync"
                );

                // ✅ Garantir que o userId está presente antes de sincronizar
                const companyWithUserId = {
                  ...companyResult.data,
                  userId: authData.user.id, // ✅ Passar o userId do Supabase Auth explicitamente
                };

                const syncResult = await syncCompanyToSupabase(
                  companyWithUserId,
                );

                if (syncResult.success) {
                  console.log(
                    "✅ Empresa sincronizada com Supabase com sucesso!",
                  );
                } else {
                  console.warn(
                    "⚠️ Erro ao sincronizar empresa com Supabase:",
                    syncResult.error,
                  );
                }
              } catch (syncError) {
                console.warn(
                  "⚠️ Erro ao sincronizar empresa com Supabase:",
                  syncError,
                );
                // Não interromper o fluxo se a sincronização falhar
              }
            } else {
              console.error(
                "❌ Erro ao criar empresa no LocalStorage:",
                companyResult.error,
              );
            }

            console.log("");
            console.log(
              "═══════════════════════════════════════════════════════════",
            );
            console.log("");
          }

          // 🚚 Step 3.6: Create driver record for caminhoneiro
          if (userData.userType === "caminhoneiro") {
            console.log("");
            console.log(
              "═══════════════════════════════════════════════════════════",
            );
            console.log(
              "🚚 AuthScreen - Criando registro do motorista",
            );
            console.log(
              "═══════════════════════════════════════════════════════════",
            );
            console.log("");
            console.log("📋 userData completo recebido:", {
              nome: userData.nome,
              cpf: userData.cpf,
              rg: userData.rg,
              dataNascimento: userData.dataNascimento,
              cnh: userData.cnh,
              categoriaCNH: userData.categoriaCNH,
              validadeCNH: userData.validadeCNH,
              rntrc: userData.rntrc,
              validadeRNTRC: userData.validadeRNTRC,
              telefone: userData.telefone,
              celular: userData.celular,
              tiposVeiculos: userData.tiposVeiculos,
              tipoVeiculo: userData.tipoVeiculo,
              marcaModelo: userData.marcaModelo,
              placaVeiculo: userData.placaVeiculo,
              modeloVeiculo: userData.modeloVeiculo,
              anoVeiculo: userData.anoVeiculo,
              capacidadeVeiculo: userData.capacidadeVeiculo,
              renavam: userData.renavam,
              anttVeiculo: userData.anttVeiculo,
              allKeys: Object.keys(userData).join(", "),
            });
            console.log("");

            const driverData = {
              userId: authData.user.id,
              name: userData.nome || "Motorista",
              cpf: userData.cpf || "",
              rg: userData.rg || "",
              birthDate: userData.dataNascimento || "",
              cnh: userData.cnh || "",
              cnhCategory: userData.categoriaCNH || "",
              cnhValidity: userData.validadeCNH || "",
              rntrc: userData.rntrc || "",
              rntrcExpiry: userData.validadeRNTRC || "",
              phone:
                userData.telefone || userData.celular || "",
              address: {
                cep: userData.cep || "",
                street: userData.endereco || "",
                number: userData.numero || "",
                complement: userData.complemento || "",
                neighborhood: userData.bairro || "",
                city: userData.cidade || "",
                state: userData.estado || "",
              },
              vehiclePlate: userData.placaVeiculo || "",
              vehicleModel: userData.marcaModelo || "",
              vehicleYear: userData.anoVeiculo || "",
              renavam: userData.renavam || "",
              anttVehicle: userData.anttVeiculo || "",
              // ✅ Tipos de veículos e carrocerias (ARRAYS)
              vehicleTypes: userData.tiposVeiculos || [],
              bodyTypes: userData.tiposCarrocerias || [],
              vehicleCapacity: userData.capacidadeVeiculo || 0,
              vehicle: {
                type:
                  userData.tiposVeiculos?.[0] ||
                  userData.tipoVeiculo ||
                  "",
                plate: userData.placaVeiculo || "",
                model:
                  userData.marcaModelo ||
                  userData.modeloVeiculo ||
                  "",
                year: userData.anoVeiculo || "",
                capacity:
                  userData.capacidadeVeiculo?.toString() || "0",
              },
              // ✅ CORREÇÃO CRÍTICA #1: Adicionar foto de perfil
              profileImage: avatarPath || "",
              // ✅ CORREÇÃO CRÍTICA #2: Adicionar paths dos documentos
              documentPaths:
                documentPaths &&
                Object.keys(documentPaths).length > 0
                  ? documentPaths
                  : null,
              status: "available" as const,
              rating: 0,
              totalTrips: 0,
              completedTrips: 0,
            };

            console.log("📤 driverData que será salvo:", {
              userId: driverData.userId,
              name: driverData.name,
              cpf: driverData.cpf,
              cnh: driverData.cnh,
              cnhCategory: driverData.cnhCategory,
              phone: driverData.phone,
              vehicle: driverData.vehicle,
              profileImage: driverData.profileImage, // ✅ Log
              documentPaths: driverData.documentPaths
                ? Object.keys(driverData.documentPaths)
                : null, // ✅ Log
            });
            console.log("");

            const driverResult =
              await database.drivers.create(driverData);

            if (driverResult.success) {
              console.log(
                "✅ Motorista criado com sucesso no LocalStorage:",
                {
                  id: driverResult.data?.id,
                  name: driverResult.data?.name,
                  cnh: driverResult.data?.cnh,
                },
              );
              console.log("");

              // 🔄 Sincronizar motorista com Supabase
              try {
                console.log(
                  "🔄 Sincronizando motorista com Supabase...",
                );
                const { syncDriverToSupabase } = await import(
                  "../utils/supabase-sync"
                );

                // ✅ Garantir que o userId está presente antes de sincronizar
                const driverWithUserId = {
                  ...driverResult.data,
                  userId: authData.user.id, // ✅ Passar o userId do Supabase Auth explicitamente
                };

                const syncResult =
                  await syncDriverToSupabase(driverWithUserId);

                if (syncResult.success) {
                  console.log(
                    "✅ Motorista sincronizado com Supabase com sucesso!",
                  );
                } else {
                  console.warn(
                    "⚠️ Erro ao sincronizar motorista com Supabase:",
                    syncResult.error,
                  );
                }
              } catch (syncError) {
                console.warn(
                  "⚠️ Erro ao sincronizar motorista com Supabase:",
                  syncError,
                );
                // Não interromper o fluxo se a sincronização falhar
              }
            } else {
              console.error(
                "❌ Erro ao criar motorista no LocalStorage:",
                driverResult.error,
              );
            }

            console.log("");
            console.log(
              "═══════════════════════════════════════════════════════════",
            );
            console.log("");
          }

          // Step 4: Check for pending invite and accept it
          const {
            checkPendingInvite,
            acceptInviteAfterRegistration,
            createSuperAdminOnRegistration,
          } = await import("../utils/collaborator-helpers");

          const inviteCheck = await checkPendingInvite(
            userData.email,
          );
          if (
            inviteCheck.hasPendingInvite &&
            inviteCheck.invite
          ) {
            console.log(
              "📧 Convite pendente detectado - aceitando automaticamente...",
            );

            const acceptResult =
              await acceptInviteAfterRegistration(
                inviteCheck.invite,
                authData.user.id,
                authData.session?.access_token,
              );

            if (acceptResult.success) {
              toast.success(
                "Cadastro realizado e convite aceito com sucesso!",
              );
            } else {
              console.warn(
                "⚠️ Erro ao aceitar convite:",
                acceptResult.error,
              );
              toast.success("Cadastro realizado com sucesso!");
            }
          } else {
            // Step 5: Create Super Admin if user is transportadora or agenciador
            if (
              userData.userType === "transportadora" ||
              userData.userType === "agenciador"
            ) {
              console.log(
                "🔐 Criando Super Admin automaticamente...",
              );

              const adminResult =
                await createSuperAdminOnRegistration(
                  newUser.data,
                  authData.user.id,
                  authData.session?.access_token,
                );

              if (adminResult.success) {
                console.log(
                  "✅ Super Admin criado com sucesso!",
                );
                toast.success(
                  "Cadastro realizado e perfil de administrador configurado!",
                );
              } else {
                console.warn(
                  "⚠️ Erro ao criar Super Admin:",
                  adminResult.error,
                );
                toast.success(
                  "Cadastro realizado com sucesso!",
                );
              }
            } else {
              toast.success("Cadastro realizado com sucesso!");
            }
          }

          // Step 6: Auto-login após cadastro
          await onLogin(userData.email, userData.password);
        } else {
          throw new Error(
            "Falha ao criar usuário no database local",
          );
        }
      }
    } catch (error) {
      console.error("Registration error:", error);
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erro ao criar conta. Tente novamente.";
      toast.error(errorMessage);
    }
  };

  const handleBackToAuth = () => {
    setViewMode("auth");
    setSelectedUserType(null);
  };

  // Função para solicitar recuperação de senha
  const handlePasswordReset = async () => {
    if (!resetEmail || !resetEmail.trim()) {
      toast.error("Por favor, insira um email válido");
      return;
    }

    if (!resetEmail.includes("@")) {
      toast.error("Por favor, insira um email válido");
      return;
    }

    setResetLoading(true);

    try {
      console.log(
        "📧 Solicitando recuperação de senha para:",
        resetEmail,
      );

      const { error } =
        await supabase.auth.resetPasswordForEmail(resetEmail, {
          redirectTo: `${window.location.origin}/reset-password`,
        });

      if (error) {
        console.error(
          "❌ Erro ao solicitar recuperação de senha:",
          error,
        );
        throw error;
      }

      console.log(
        "✅ Email de recuperação enviado com sucesso!",
      );
      toast.success(
        "Email de recuperação enviado! Verifique sua caixa de entrada.",
        {
          duration: 8000,
        },
      );

      setShowPasswordResetModal(false);
      setResetEmail("");
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Erro ao enviar email de recuperação";
      console.error("❌ Erro:", errorMessage);
      toast.error(
        "Erro ao enviar email de recuperação. Tente novamente.",
      );
    } finally {
      setResetLoading(false);
    }
  };

  // QuickRegistration removido - agora tudo é feito no fluxo unificado

  // CompleteProfile removido - agora tudo é feito no UnifiedRegistration

  // Show registration flow (antigo - manter para compatibilidade)
  if (viewMode === "registration-flow") {
    return (
      <RegistrationFlow
        onComplete={handleRegistrationComplete}
        onBackToAuth={handleBackToAuth}
        selectedUserType={selectedUserType as any}
      />
    );
  }

  return (
    <div className="w-full px-4 py-8">
      <div className="w-full max-w-md my-auto mx-auto">
        {/* Logo */}
        <motion.div
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <div className="w-56 h-28 mx-auto mb-8">
            <img
              src={logoMaisFrete}
              alt="MaisFrete"
              className="w-full h-full object-contain"
            />
          </div>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Card
            className="border-0"
            style={{
              boxShadow: [
                '0 0 0 1px rgba(29,52,99,0.06)',
                '0 8px 30px 0px rgba(29,52,99,0.14)',
                '0 20px 60px 0px rgba(29,52,99,0.10)',
                '0 -8px 30px 0px rgba(29,52,99,0.14)',
                '0 -20px 60px 0px rgba(29,52,99,0.10)',
                '-10px 0 24px 0px rgba(29,52,99,0.08)',
                '10px 0 24px 0px rgba(29,52,99,0.08)',
              ].join(', '),
            }}
          >
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl text-primary">
                {isLogin ? "Entrar" : "Criar Conta"}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Sistema de logística de fretes
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Login Form - sempre visível quando isLogin é true */}
              {isLogin ? (
                <form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            email: e.target.value,
                          })
                        }
                        className="pl-10"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={
                          showPassword ? "text" : "password"
                        }
                        value={formData.password}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            password: e.target.value,
                          })
                        }
                        className="pl-10 pr-10"
                        placeholder="••••••••"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() =>
                          setShowPassword(!showPassword)
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    </div>

                    {/* Link para recuperação de senha */}
                    <div className="text-left pt-1">
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => {
                          setResetEmail(formData.email);
                          setShowPasswordResetModal(true);
                        }}
                        className="text-xs text-muted-foreground hover:text-primary h-auto p-0"
                      >
                        Esqueci minha senha
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-primary hover:bg-primary/90 text-white"
                    disabled={loading}
                  >
                    {loading ? "Entrando..." : "Entrar"}
                  </Button>

                  {/* Toggle between login and register */}
                  <div className="text-center pt-2">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setIsLogin(!isLogin)}
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      <>
                        Não tem conta?{" "}
                        <span className="font-medium ml-1">
                          Criar nova conta
                        </span>
                      </>
                    </Button>
                  </div>
                </form>
              ) : (
                /* Registration Type Selection - NOVO FLUXO SIMPLIFICADO */
                <div className="space-y-4">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Escolha o tipo de cadastro:
                  </Label>
                  <div className="grid gap-2">
                    <Button
                      onClick={() =>
                        handleStartRegistration("caminhoneiro")
                      }
                      disabled={loading}
                      variant="outline"
                      className="flex items-center justify-start gap-3 h-16 hover:border-primary hover:bg-background hover:text-foreground transition-colors"
                    >
                      <Truck className="w-6 h-6 text-primary" />
                      <div className="text-left">
                        <div className="font-medium">
                          Caminhoneiro
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Motorista autônomo ou profissional
                        </div>
                      </div>
                    </Button>

                    <Button
                      onClick={() =>
                        handleStartRegistration(
                          "transportadora",
                        )
                      }
                      disabled={loading}
                      variant="outline"
                      className="flex items-center justify-start gap-3 h-16 hover:border-primary hover:bg-background hover:text-foreground transition-colors"
                    >
                      <Building className="w-6 h-6 text-primary" />
                      <div className="text-left">
                        <div className="font-medium">
                          Transportadora/Embarcador
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Empresa de transporte ou embarcador
                        </div>
                      </div>
                    </Button>
                  </div>

                  {/* Toggle back to login */}
                  <div className="text-center pt-2">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => setIsLogin(!isLogin)}
                      className="text-sm text-muted-foreground hover:text-primary"
                    >
                      <>
                        Já tem conta?{" "}
                        <span className="font-medium ml-1">
                          Fazer login
                        </span>
                      </>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="text-center mt-8 space-y-3"
        >
          <p className="text-muted-foreground text-sm">
            © 2026 MooveFretes - Logística Inteligente
          </p>
        </motion.div>
      </div>

      {/* Database Error Alert */}
      {showDatabaseError && (
        <DatabaseErrorAlert
          onClose={() => setShowDatabaseError(false)}
        />
      )}

      {/* Email Not Confirmed Error Alert */}
      {showEmailNotConfirmedError && (
        <EmailNotConfirmedAlert
          onClose={() => setShowEmailNotConfirmedError(false)}
        />
      )}

      {/* Password Reset Modal */}
      <Dialog
        open={showPasswordResetModal}
        onOpenChange={setShowPasswordResetModal}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recuperar Senha</DialogTitle>
            <DialogDescription>
              Digite seu email para receber instruções de
              recuperação de senha.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="reset-email"
                  type="email"
                  value={resetEmail}
                  onChange={(e) =>
                    setResetEmail(e.target.value)
                  }
                  className="pl-10"
                  placeholder="seu@email.com"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handlePasswordReset();
                    }
                  }}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowPasswordResetModal(false);
                setResetEmail("");
              }}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handlePasswordReset}
              disabled={resetLoading}
              className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white"
            >
              {resetLoading ? "Enviando..." : "Enviar Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}