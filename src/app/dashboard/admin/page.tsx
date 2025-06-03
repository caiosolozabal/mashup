"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { calculateMonthlyRevenueSummaryForAllDJs, ResumoFinanceiroMensalAgencia } from '@/lib/adminService'; // Ajuste o caminho se necessário

// Função para formatar moeda
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

export default function AdminDashboardPage() {
  const [loading, setLoading] = useState<boolean>(true);
  const [financialSummary, setFinancialSummary] = useState<ResumoFinanceiroMensalAgencia | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFinancialData = async () => {
      setLoading(true);
      setError(null);
      try {
        const today = new Date();
        const currentYear = today.getFullYear();
        const currentMonth = today.getMonth() + 1; // Mês é 1-12

        console.log(`[AdminDashboard] Buscando dados financeiros para ${currentMonth}/${currentYear}...`);
        const summary = await calculateMonthlyRevenueSummaryForAllDJs(currentYear, currentMonth);
        console.log("[AdminDashboard] Dados recebidos:", summary);
        setFinancialSummary(summary);
      } catch (err) {
        console.error("[AdminDashboard] Erro ao buscar dados financeiros:", err);
        setError("Falha ao carregar o resumo financeiro.");
        setFinancialSummary(null); // Limpa dados em caso de erro
      } finally {
        setLoading(false);
      }
    };

    fetchFinancialData();
  }, []);

  // Prepara dados para o gráfico Recharts - AGORA INCLUI VALOR LÍQUIDO DJ
  const chartData = financialSummary?.resumoPorDJ.map(dj => ({
    name: dj.djNome,
    "Valor Líquido DJ": dj.valorLiquidoDJ, // Usar este valor para a barra única
    // Manter outros valores se precisar no tooltip
    "Valor Bruto": dj.valorBruto,
    "Valor Agência": dj.valorAgencia,
    "Eventos": dj.eventosConsiderados
  })) || [];

  // Custom Tooltip para mostrar mais detalhes
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload; // Acessa os dados completos do item
      return (
        <div className="bg-white p-2 border border-gray-300 rounded shadow-sm text-sm">
          <p className="font-bold mb-1">{label}</p>
          <p className="text-blue-600">{`Valor Líquido DJ: ${formatCurrency(data["Valor Líquido DJ"])}`}</p>
          <p className="text-gray-600">{`Valor Bruto Eventos: ${formatCurrency(data["Valor Bruto"])}`}</p>
          <p className="text-gray-600">{`Valor Agência: ${formatCurrency(data["Valor Agência"])}`}</p>
          <p className="text-gray-600">{`Eventos Considerados: ${data["Eventos"]}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Admin</h2>
      </div>

      {/* Cards de Navegação Rápida (inalterados) */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
         <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gerenciar Eventos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-2">Visualizar, criar, editar ou excluir eventos.</div>
            <Link href="/dashboard/admin/manage-events/table" passHref>
              <Button size="sm">Ver Eventos</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gerenciar Usuários</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-2">Adicionar ou editar DJs e outros usuários.</div>
            <Link href="/dashboard/admin/manage-users" passHref>
              <Button size="sm">Ver Usuários</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Financeiro</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-2">Relatórios financeiros detalhados.</div>
            <Link href="/dashboard/admin/financeiro" passHref>
              <Button size="sm">Ver Financeiro</Button>
            </Link>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Configurações</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-2">Ajustes gerais da plataforma.</div>
            <Link href="/dashboard/admin/settings" passHref>
              <Button size="sm">Ver Configurações</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Seção do Gráfico Financeiro AJUSTADO */}
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Resumo Financeiro por DJ (Mês Atual)</CardTitle>
        </CardHeader>
        <CardContent className="pl-2">
          {loading && <p>Carregando dados financeiros...</p>}
          {error && <p className="text-red-500">{error}</p>}
          {!loading && !error && financialSummary && (
            <>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  {/* Gráfico AJUSTADO para uma barra por DJ (Valor Líquido) */}
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    {/* Tooltip customizado para mostrar mais detalhes no hover */}
                    <Tooltip content={<CustomTooltip />} />
                    {/* Legenda pode ser removida ou mantida se desejar */}
                    {/* <Legend /> */}
                    <Bar dataKey="Valor Líquido DJ" fill="#3b82f6" name="Valor Líquido DJ" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p>Nenhum dado financeiro encontrado para os DJs neste mês.</p>
              )}

              {/* Somatórios Gerais (inalterados) */}
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-lg font-semibold mb-2">Totais do Mês Atual</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Bruto (Todos os DJs)</p>
                    <p className="text-2xl font-bold">{formatCurrency(financialSummary.totalBrutoGeral)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Líquido (Agência)</p>
                    <p className="text-2xl font-bold">{formatCurrency(financialSummary.totalAgenciaGeral)}</p>
                  </div>
                   <div>
                    <p className="text-sm text-muted-foreground">Total Líquido (DJs)</p>
                    <p className="text-2xl font-bold">{formatCurrency(financialSummary.totalLiquidoDJs)}</p>
                  </div>
                   <div>
                    <p className="text-sm text-muted-foreground">Total de Eventos Considerados</p>
                    <p className="text-2xl font-bold">{financialSummary.totalEventosGeral}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Outras seções do dashboard podem vir aqui */}

    </div>
  );
}

