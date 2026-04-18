// Force rebuild - 2026-03-03
import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "./ui/sheet";
import {
  ArrowLeft,
  Search,
  MapPin,
  Star,
  MessageCircle,
  Building2,
  Package,
  Eye,
  CheckCircle,
  Truck,
  RefreshCw,
  Shield,
  Send,
  Loader2,
  Filter,
  Heart,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { ImageWithFallback } from "./ImageWithFallback";
import { getAvatarUrl } from '../utils/storage-helper'; // ✅ IMPORTAR HELPER DE STORAGE
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Textarea } from "./ui/textarea";
import { CompanyDetailContent } from "./CompanyDetailContent";
import type { User } from "./contexts/AppContext";
import { database } from "../utils/database";
import { LoadingSpinner } from "./LoadingSpinner";
import type {
  Company as DBCompany,
  Freight,
  Rating,
} from "../utils/database/schema";
import { supabase } from "../utils/supabase/client";
import { ToolbarHeader } from "./ToolbarHeader";
import {
  CompanyFilters,
  initialCompanyFiltersState,
  CompanyFiltersState,
} from "./company/CompanyFilters";
import { generateDeepLinkUrl } from '../utils/deep-link';

interface CompanyStats {
  totalFreights: number;
  activeFreights: number;
  completedFreights: number;
  inTransitFreights: number;
  averageRating: number;
  reviewCount: number;
  successRate: number;
}

interface Company {
  id: string;
  userId: string;
  name: string;
  type: "transportadora" | "embarcador" | "agenciador";
  cnpj: string;
  phone: string;
  email: string;
  logo?: string;
  location: {
    city: string;
    state: string;
  };
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    cep?: string;
  };
  verified: boolean;
  memberSince: string;
  description?: string;
  website?: string;
  stats: CompanyStats;
}

interface CompaniesScreenProps {
  user: User;
  onBack?: () => void;
  onOpenChat?: (userId: string, userName: string) => void;
  onViewFreight?: (freightId: string) => void;
  initialSelectedId?: string | null;
}

export function CompaniesScreen({
  user,
  onBack,
  onOpenChat,
  onViewFreight,
  initialSelectedId,
}: CompaniesScreenProps) {
  // ✅ Resolver companyId: se for colaborador, usar o companyId da empresa vinculada
  const resolvedCompanyId = user?.collaborator?.companyId || user?.id || '';
  const displayName = user?.collaborator ? (user?.collaborator?.companyName || user.name) : user.name;
  
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState<
    "all" | "transportadora" | "embarcador" | "agenciador"
  >("all");
  const [selectedState, setSelectedState] = useState("all");
  const [selectedCompany, setSelectedCompany] =
    useState<Company | null>(null);
  const [showCompanyDetails, setShowCompanyDetails] =
    useState(false);
  const [showMessageDialog, setShowMessageDialog] =
    useState(false);
  const [messageText, setMessageText] = useState("");
  const [
    selectedFreightForMessage,
    setSelectedFreightForMessage,
  ] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<
    "rating" | "freights" | "recent"
  >("rating");
  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] =
    useState(false);
  const [filters, setFilters] = useState<CompanyFiltersState>(
    initialCompanyFiltersState,
  );
  const [favorites, setFavorites] = useState<Set<string>>(
    new Set(),
  );
  const [loadingFavorites, setLoadingFavorites] =
    useState(false);

  // Carregar favoritos do usuário
  useEffect(() => {
    if (!resolvedCompanyId) return;

    const loadFavorites = async () => {
      try {
        setLoadingFavorites(true);
        const response =
          await database.favorites.getUserFavorites(resolvedCompanyId);
        if (response.success && response.data) {
          setFavorites(new Set(response.data));
        }
      } catch (error) {
        console.error("❌ Erro ao buscar favoritos:", error);
      } finally {
        setLoadingFavorites(false);
      }
    };

    loadFavorites();
  }, [resolvedCompanyId]);

  // Carregar empresas com sincronização completa do Supabase
  useEffect(() => {
    loadCompaniesWithStats();
  }, []);

  // 🔗 Auto-select company from deep link
  useEffect(() => {
    if (initialSelectedId && companies.length > 0 && !loading) {
      const targetCompany = companies.find(c => c.userId === initialSelectedId || c.id === initialSelectedId);
      if (targetCompany) {
        setSelectedCompany(targetCompany);
        setShowCompanyDetails(true);
      } else {
      }
    }
  }, [initialSelectedId, companies, loading]);

  const loadCompaniesWithStats = async () => {
    setLoading(true);

    try {
      // 1. Buscar empresas DO SUPABASE (não do LocalStorage)
      const { data: supabaseCompanies, error: companiesError } =
        await supabase
          .from("companies")
          .select("*")
          .order("created_at", { ascending: false });

      // Buscar profiles separadamente
      let profilesMap = new Map<string, any>();
      if (supabaseCompanies && supabaseCompanies.length > 0) {
        const userIds = supabaseCompanies.map((c) => c.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name, email, phone, avatar_url, rating, city, state")
          .in("id", userIds);

        if (profiles) {
          profiles.forEach((p) => {
            profilesMap.set(p.id, p);
          });
        }
      }

      if (companiesError) {
        console.error(
          "❌ Erro ao buscar empresas do Supabase:",
          companiesError,
        );
        // Fallback para LocalStorage
        const companiesResponse =
          await database.companies.getAll();
        if (
          !companiesResponse.success ||
          !companiesResponse.data ||
          companiesResponse.data.length === 0
        ) {
          setCompanies([]);
          setLoading(false);
          return;
        }
        // [REVISAR] console.log(
        // `📊 ${companiesResponse.data.length} empresas encontradas (LocalStorage)`,
        // );
      } else if (
        !supabaseCompanies ||
        supabaseCompanies.length === 0
      ) {
        setCompanies([]);
        setLoading(false);
        return;
      }


      // 2. Buscar todos os fretes e ratings de uma vez para otimização
      const [allFreightsResponse, allRatingsResponse] =
        await Promise.all([
          database.freights.getAll({ limit: 10000 }),
          database.ratings.getAll({ limit: 10000 }),
        ]);

      const allFreightsRaw =
        allFreightsResponse.success && allFreightsResponse.data
          ? allFreightsResponse.data
          : [];
      const allRatings =
        allRatingsResponse.success && allRatingsResponse.data
          ? allRatingsResponse.data
          : [];

      // 🔒 Filtrar fretes pausados/inativos - eles não devem aparecer em listagens públicas
      const allFreights = allFreightsRaw.filter(
        (f) => f.status !== "inactive",
      );


      // Log detalhado dos fretes para debug
      // [REVISAR] console.log(
      // "📋 Detalhes dos fretes:",
      // allFreights.map((f) => ({
      // id: f.id,
      // customerId: f.customerId,
      // customerName: f.customerName,
      // status: f.status,
      // origem:
      // f.origin?.city && f.origin?.state
      // ? `${f.origin.city}/${f.origin.state}`
      // : "N/A",
      // destino:
      // f.destination?.city && f.destination?.state
      // ? `${f.destination.city}/${f.destination.state}`
      // : "N/A",
      // })),
      // );

      // 3. Criar mapas para consulta rápida
      const freightsByCustomer = new Map<string, Freight[]>();
      allFreights.forEach((freight) => {
        if (!freightsByCustomer.has(freight.customerId)) {
          freightsByCustomer.set(freight.customerId, []);
        }
        freightsByCustomer
          .get(freight.customerId)!
          .push(freight);
      });

      // [REVISAR] console.log("🗂️ Mapa de fretes por customerId:", {
      // totalEmpresas: freightsByCustomer.size,
      // empresasComFretes: Array.from(
      // freightsByCustomer.entries(),
      // ).map(([customerId, freights]) => ({
      // customerId,
      // count: freights.length,
      // fretes: freights.map((f) => ({
      // id: f.id,
      // status: f.status,
      // })),
      // })),
      // });

      const ratingsByDriver = new Map<string, Rating[]>();
      allRatings.forEach((rating) => {
        if (!ratingsByDriver.has(rating.targetId)) {
          ratingsByDriver.set(rating.targetId, []);
        }
        ratingsByDriver.get(rating.targetId)!.push(rating);
      });

      // 4. Processar empresas DO SUPABASE
      const companiesWithStats: Company[] = await Promise.all(
        (supabaseCompanies || []).map(
          async (companyData: any) => {
            const profile =
              profilesMap.get(companyData.user_id) || {};
            const companyName =
              companyData.company_name ||
              companyData.name ||
              companyData.trading_name ||
              profile.name ||
              "Empresa";


            // Buscar fretes da empresa usando o user_id
            const companyFreights =
              freightsByCustomer.get(companyData.user_id) || [];

            if (companyFreights.length > 0) {
              // [REVISAR] console.log(
              // `   Detalhes dos fretes:`,
              // companyFreights.map((f) => ({
              // id: f.id,
              // status: f.status,
              // customerId: f.customerId,
              // rota: `${f.origin?.city || "N/A"}/${f.origin?.state || "N/A"} → ${f.destination?.city || "N/A"}/${f.destination?.state || "N/A"}`,
              // })),
              // );
            }

            // Calcular estatísticas de fretes
            const activeFreights = companyFreights.filter(
              (f) => f.status === "active",
            );
            const completedFreights = companyFreights.filter(
              (f) =>
                f.status === "completed" ||
                f.status === "delivered",
            );
            const inTransitFreights = companyFreights.filter(
              (f) => f.status === "in-transit",
            );


            // Buscar avaliações da empresa (como motorista/prestador)
            const companyRatings =
              ratingsByDriver.get(companyData.user_id) || [];

            // Calcular média de avaliações
            const averageRating =
              companyRatings.length > 0
                ? companyRatings.reduce(
                    (sum, r) => sum + r.overallRating,
                    0,
                  ) / companyRatings.length
                : profile.rating || 0;

            // Calcular taxa de sucesso
            const successRate =
              companyFreights.length > 0
                ? (completedFreights.length /
                    companyFreights.length) *
                  100
                : 0;

            const stats: CompanyStats = {
              totalFreights: companyFreights.length,
              activeFreights: activeFreights.length,
              completedFreights: completedFreights.length,
              inTransitFreights: inTransitFreights.length,
              averageRating: Number(averageRating.toFixed(1)),
              reviewCount: companyRatings.length,
              successRate: Number(successRate.toFixed(0)),
            };


            // ✅ PARSEAR ENDEREÇO (campo address é STRING JSON no banco)
            let parsedAddress: any = {};
            try {
              if (companyData.address && typeof companyData.address === 'string') {
                parsedAddress = JSON.parse(companyData.address);
              } else if (companyData.address && typeof companyData.address === 'object') {
                parsedAddress = companyData.address;
              }
            } catch (error) {
              parsedAddress = {};
            }

            return {
              id: companyData.id,
              userId: companyData.user_id,
              name: companyName,
              type: (companyData.company_type ||
                companyData.type) as
                | "transportadora"
                | "embarcador"
                | "agenciador",
              cnpj: companyData.cnpj || "",
              phone: companyData.phone || profile.phone || "",
              email: companyData.email || profile.email || "",
              logo: profile.avatar_url || companyData.logo, // ⚠️ PATH - conversão acontece na exibição
              location: {
                city: profile.city || parsedAddress?.city || "",
                state: profile.state || parsedAddress?.state || "",
              },
              address: {
                street: parsedAddress?.street || "",
                number: parsedAddress?.number || "",
                complement: parsedAddress?.complement || "",
                neighborhood: parsedAddress?.neighborhood || "",
                city: parsedAddress?.city || profile.city || "",
                state: parsedAddress?.state || profile.state || "",
                cep: parsedAddress?.cep || "",
              },
              verified:
                companyData.verification_status ===
                  "verified" ||
                companyData.verificationStatus === "verified",
              memberSince:
                companyData.created_at ||
                new Date().toISOString(),
              description: companyData.description,
              website: companyData.website || profile.website,
              stats,
            };
          },
        ),
      );

      // [REVISAR] console.log(
      // "\n✅ RESUMO FINAL - Empresas processadas com estatísticas completas:",
      // {
      // total: companiesWithStats.length,
      // comFretes: companiesWithStats.filter(
      // (c) => c.stats.totalFreights > 0,
      // ).length,
      // comAvaliacoes: companiesWithStats.filter(
      // (c) => c.stats.reviewCount > 0,
      // ).length,
      // detalhes: companiesWithStats.map((c) => ({
      // nome: c.name,
      // userId: c.userId,
      // tipo: c.type,
      // fretesAtivos: c.stats.activeFreights,
      // fretesTotal: c.stats.totalFreights,
      // })),
      // },
      // );

      setCompanies(companiesWithStats);
    } catch (error) {
      console.error("❌ Erro ao carregar empresas:", error);
      toast.error("Erro ao carregar empresas");
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar empresas
  const filteredCompanies = companies.filter((company) => {
    const matchesSearch =
      company.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      company.location.city
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      company.location.state
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      company.cnpj
        .replace(/\D/g, "")
        .includes(searchTerm.replace(/\D/g, "")) ||
      company.phone
        .replace(/\D/g, "")
        .includes(searchTerm.replace(/\D/g, ""));

    const matchesType =
      selectedType === "all" || company.type === selectedType;
    const matchesState =
      selectedState === "all" ||
      company.location.state === selectedState;

    return matchesSearch && matchesType && matchesState;
  });

  // Ordenar empresas
  const sortedCompanies = [...filteredCompanies].sort(
    (a, b) => {
      switch (sortBy) {
        case "rating":
          return b.stats.averageRating - a.stats.averageRating;
        case "freights":
          return b.stats.totalFreights - a.stats.totalFreights;
        case "recent":
          return (
            new Date(b.memberSince).getTime() -
            new Date(a.memberSince).getTime()
          );
        default:
          return 0;
      }
    },
  );

  const handleSendMessage = async (
    company: Company,
    freightId?: string,
  ) => {
    if (!messageText.trim()) {
      toast.error("Digite uma mensagem");
      return;
    }

    try {
      // Criar conversa no chat
      const response = await database.chats.create({
        participants: [resolvedCompanyId, company.userId],
        participantNames: [displayName, company.name],
        type: "direct",
        freightId: freightId,
      });

      if (response.success && response.data) {
        // Enviar mensagem
        await database.messages.create({
          chatId: response.data.id,
          senderId: user.id,
          senderName: user.name,
          content: messageText,
          type: "text",
          readBy: [user.id],
        });

        toast.success("Mensagem enviada com sucesso!");
        setShowMessageDialog(false);
        setMessageText("");

        // Abrir chat
        onOpenChat && onOpenChat(company.userId, company.name);
      }
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      toast.error("Erro ao enviar mensagem");
    }
  };

  const handleWhatsAppContact = (company: Company) => {
    const phone = company.phone.replace(/\D/g, "");

    // Gerar saudação baseada na hora do dia
    const hour = new Date().getHours();
    let greeting = "Bom dia";
    if (hour >= 12 && hour < 18) {
      greeting = "Boa tarde";
    } else if (hour >= 18) {
      greeting = "Boa noite";
    }

    const today = new Date().toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const message = encodeURIComponent(
      `*Olá ${company.name}, sou ${user.name} da MooveFretes.*\n\n🤝 Gostaria de conversar sobre *parcerias de frete.*\n\n👤 *Meu perfil:*\n${generateDeepLinkUrl('profile', user.id)}\n\n👤 *Perfil da empresa:*\n${generateDeepLinkUrl('profile', company.userId)}\n\n*Podemos conversar?* 🚚`,
    );
    const whatsappUrl = `https://api.whatsapp.com/send?phone=55${phone}&text=${message}`;
    window.open(whatsappUrl, "_blank");
    toast.success("Abrindo WhatsApp...");
  };

  const handleToggleFavoriteCard = async (
    e: React.MouseEvent,
    companyId: string,
    companyName: string,
  ) => {
    e.stopPropagation();
    if (!resolvedCompanyId) {
      toast.error("Faça login para adicionar favoritos");
      return;
    }

    const isFav = favorites.has(companyId);
    const newFavorites = new Set(favorites);

    try {
      if (isFav) {
        // Remover dos favoritos
        const response =
          await database.favorites.removeFavorite(
            resolvedCompanyId,
            companyId,
          );
        if (response.success) {
          newFavorites.delete(companyId);
          setFavorites(newFavorites);
          toast.success(
            `${companyName} removida dos favoritos`,
          );
        }
      } else {
        // Adicionar aos favoritos
        const response = await database.favorites.addFavorite(
          resolvedCompanyId,
          companyId,
        );
        if (response.success) {
          newFavorites.add(companyId);
          setFavorites(newFavorites);
          toast.success(
            `${companyName} adicionada aos favoritos!`,
          );
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar favorito:", error);
      toast.error("Erro ao atualizar favorito");
    }
  };

  const CompanyCard = ({ company }: { company: Company }) => {
    // ✅ CONVERTER PATH → URL dinamicamente
    const logoUrl = React.useMemo(() => getAvatarUrl(company.logo), [company.logo]);
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-all cursor-pointer"
        onClick={() => {
          setSelectedCompany(company);
          setShowCompanyDetails(true);
        }}
      >
        <div className="p-4 flex items-start gap-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={company.name}
                className="w-14 h-14 rounded-lg object-cover bg-gray-100"
              />
            ) : (
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-white" />
            </div>
          )}
        </div>

        {/* Informações */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              {/* Nome */}
              <h3 className="font-medium text-foreground mb-1 truncate">
                {company.name}
              </h3>

              {/* Badge Tipo */}
              <div className="mb-2">
                <Badge
                  variant="secondary"
                  className="text-xs bg-primary/10 text-primary border-0"
                >
                  {company.type === "transportadora"
                    ? "Transportadora"
                    : company.type === "embarcador"
                      ? "Embarcador"
                      : "Agenciador"}
                </Badge>
              </div>

              {/* Localização */}
              {company.location.city &&
                company.location.state && (
                  <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                    <MapPin className="w-4 h-4" />
                    <span>
                      {company.location.city.toUpperCase()} -{" "}
                      {company.location.state}
                    </span>
                  </div>
                )}

              {/* Estatísticas */}
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                  <span>
                    {(company.stats.averageRating ?? 0).toFixed(1)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-gray-400" />
                  <span>
                    {company.stats.reviewCount}{" "}
                    {company.stats.reviewCount === 1
                      ? "avaliação"
                      : "avaliações"}
                  </span>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="text-right">
              <div className="flex flex-col gap-2 items-end justify-center">
                {/* Botão de Favorito */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) =>
                    handleToggleFavoriteCard(
                      e,
                      company.userId,
                      company.name,
                    )
                  }
                  className="h-9 w-9 hover:bg-red-50"
                >
                  <Heart
                    className={`w-5 h-5 ${favorites.has(company.userId) ? "fill-red-500 text-red-500" : "text-gray-400"}`}
                  />
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenChat) {
                      onOpenChat(company.userId, company.name);
                    }
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground h-9 px-4 min-w-[120px]"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleWhatsAppContact(company);
                  }}
                  className="border-green-200 text-green-600 hover:bg-green-50 h-9 px-4 min-w-[120px]"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
  };

  return (
    <div className="h-full bg-background overflow-hidden flex flex-col">
      {/* Toolbar padronizado */}
      <ToolbarHeader
        searchPlaceholder="Buscar por nome, CNPJ, telefone, cidade ou estado..."
        searchValue={searchTerm}
        onSearchChange={setSearchTerm}
        showFilterButton={false}
        onRefresh={loadCompaniesWithStats}
        isRefreshing={loading}
        totalCount={sortedCompanies.length}
        countLabel="empresa"
      />

      {/* Conteúdo com Sidebar */}
      <div className="flex-1 overflow-y-auto px-6 pt-4 pb-6">
        {/* Layout com Sidebar de Filtros - igual ao FreightManagement */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
          {/* Sidebar de Filtros - Visível apenas em desktop */}
          <div className="hidden lg:block bg-card rounded-lg border p-4 h-fit sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-base">
                Filtros
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilters(initialCompanyFiltersState);
                  setSelectedState("all");
                  setSelectedType("all");
                  setSortBy("rating");
                }}
                className="text-xs h-7 px-2"
              >
                Limpar
              </Button>
            </div>

            <CompanyFilters
              filters={filters}
              onFilterChange={setFilters}
            />
          </div>

          {/* Lista de Empresas */}
          <div className="min-w-0">
            {loading ? (
              <LoadingSpinner message="Carregando empresas..." />
            ) : sortedCompanies.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center max-w-md">
                  <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-2">
                    Nenhuma empresa encontrada
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Tente ajustar os filtros de busca
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedCompanies.map((company) => (
                  <CompanyCard
                    key={company.id}
                    company={company}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Company Details Sheet */}
      <Sheet
        open={showCompanyDetails}
        onOpenChange={setShowCompanyDetails}
      >
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
          <SheetTitle className="sr-only">
            {selectedCompany
              ? `Detalhes de ${selectedCompany.name}`
              : "Detalhes da Empresa"}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {selectedCompany
              ? `Informações completas sobre a empresa ${selectedCompany.name}, incluindo contato, fretes ativos e avaliações.`
              : "Visualize informações detalhadas sobre a empresa selecionada."}
          </SheetDescription>
          {selectedCompany && (
            <CompanyDetailContent
              company={selectedCompany}
              user={user}
              onSendMessage={(freightId) => {
                setSelectedFreightForMessage(freightId || null);

                const today = new Date().toLocaleDateString(
                  "pt-BR",
                  {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  },
                );

                const userType =
                  user.userType === "caminhoneiro"
                    ? "motorista"
                    : "empresa";

                setMessageText(
                  freightId
                    ? `*Olá, tenho interesse no frete ${freightId}.*

📦 *Frete ${freightId}:*

🔗 *Link do frete:*
${generateDeepLinkUrl('freight', freightId)}

🚛 *Meu perfil:*
${generateDeepLinkUrl('profile', user.id)}

*A carga ainda está disponível?*`
                    : `*Olá, sou ${user.name}.*

Tenho interesse em *transportar cargas para sua empresa.*

🚛 *Meu perfil:*
${generateDeepLinkUrl('profile', user.id)}

🏢 *Perfil da empresa:*
${generateDeepLinkUrl('profile', selectedCompany?.userId || '')}

Podemos conversar? 📦`,
                );
                setShowMessageDialog(true);
                setShowCompanyDetails(false);
              }}
              onWhatsAppContact={() =>
                handleWhatsAppContact(selectedCompany)
              }
              onViewFreight={onViewFreight}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog de Mensagem */}
      <Dialog
        open={showMessageDialog}
        onOpenChange={setShowMessageDialog}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enviar Mensagem</DialogTitle>
            <DialogDescription>
              Envie uma mensagem para {selectedCompany?.name}{" "}
              demonstrando interesse
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Digite sua mensagem..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Seja profissional e objetivo. Mencione sua
              experiência e disponibilidade.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowMessageDialog(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={() =>
                selectedCompany &&
                handleSendMessage(
                  selectedCompany,
                  selectedFreightForMessage || undefined,
                )
              }
            >
              <Send className="w-4 h-4 mr-2" />
              Enviar Mensagem
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Filtros Avançados */}
      <Dialog
        open={showAdvancedFilters}
        onOpenChange={setShowAdvancedFilters}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Filtros Avançados</DialogTitle>
            <DialogDescription>
              Refine sua busca para encontrar empresas
              específicas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Tipo de Empresa */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                Tipo de Empresa
              </h4>
              <Select
                value={selectedType}
                onValueChange={(value: any) =>
                  setSelectedType(value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Todos os tipos
                  </SelectItem>
                  <SelectItem value="transportadora">
                    Transportadora
                  </SelectItem>
                  <SelectItem value="embarcador">
                    Embarcador
                  </SelectItem>
                  <SelectItem value="agenciador">
                    Agenciador
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Localização */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                Localização
              </h4>
              <div className="space-y-2">
                <label className="text-sm">Estado</label>
                <Select
                  value={selectedState}
                  onValueChange={setSelectedState}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os estados" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      Todos os estados
                    </SelectItem>
                    <SelectItem value="SP">
                      São Paulo
                    </SelectItem>
                    <SelectItem value="RJ">
                      Rio de Janeiro
                    </SelectItem>
                    <SelectItem value="MG">
                      Minas Gerais
                    </SelectItem>
                    <SelectItem value="PR">Paraná</SelectItem>
                    <SelectItem value="SC">
                      Santa Catarina
                    </SelectItem>
                    <SelectItem value="RS">
                      Rio Grande do Sul
                    </SelectItem>
                    <SelectItem value="BA">Bahia</SelectItem>
                    <SelectItem value="GO">Goiás</SelectItem>
                    <SelectItem value="DF">
                      Distrito Federal
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Ordenação */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Star className="w-4 h-4 text-primary" />
                Ordenar por
              </h4>
              <Select
                value={sortBy}
                onValueChange={(value: any) => setSortBy(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">
                    Melhor avaliação
                  </SelectItem>
                  <SelectItem value="freights">
                    Mais fretes
                  </SelectItem>
                  <SelectItem value="recent">
                    Mais recentes
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedState("all");
                setSelectedType("all");
                setSortBy("rating");
              }}
            >
              Limpar Filtros
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={() => {
                setShowAdvancedFilters(false);
                const activeFiltersCount = [
                  selectedState,
                  selectedType,
                  sortBy,
                ].filter(
                  (v) => v && v !== "all" && v !== "rating",
                ).length;
                if (activeFiltersCount > 0) {
                  toast.success(
                    `${activeFiltersCount} filtro(s) aplicado(s)`,
                  );
                }
              }}
            >
              Aplicar Filtros
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}