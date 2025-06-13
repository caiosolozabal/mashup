
'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import UserManagementTab from '@/components/settings/UserManagementTab';
import AgencyAccountsTab from '@/components/settings/AgencyAccountsTab'; // Novo import
import { useAuth } from '@/hooks/useAuth';
import { Building, Cog, Users } from 'lucide-react';

export default function SettingsPage() {
  const { userDetails } = useAuth();

  if (userDetails?.role !== 'admin' && userDetails?.role !== 'partner') {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Configurações</CardTitle>
          <CardDescription>Você não tem permissão para acessar todas as configurações.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Entre em contato com um administrador para mais informações.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline">Configurações da Plataforma</h1>
        <p className="text-muted-foreground">
          Gerencie usuários, dados da agência e outras configurações do sistema.
        </p>
      </div>
      <Tabs defaultValue="user-management" className="w-full">
        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:max-w-xl">
          <TabsTrigger value="user-management">
            <Users className="mr-2 h-4 w-4" />
            Usuários e DJs
          </TabsTrigger>
          <TabsTrigger value="agency-accounts"> {/* Habilitar esta aba */}
            <Building className="mr-2 h-4 w-4" />
            Contas da Agência
          </TabsTrigger>
          <TabsTrigger value="general-settings" disabled>
            <Cog className="mr-2 h-4 w-4" />
            Geral
          </TabsTrigger>
        </TabsList>

        <TabsContent value="user-management">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="font-headline">Gerenciamento de Usuários e DJs</CardTitle>
              <CardDescription>
                Visualize e edite os perfis, funções e detalhes dos DJs cadastrados na plataforma.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserManagementTab />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="agency-accounts">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="font-headline">Contas Bancárias da Agência</CardTitle>
              <CardDescription>
                Gerencie as contas bancárias da Mashup Music.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AgencyAccountsTab /> {/* Novo componente */}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general-settings">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="font-headline">Configurações Gerais</CardTitle>
              <CardDescription>
                Parâmetros e configurações globais do sistema. (Funcionalidade em desenvolvimento)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Em breve: opções como percentual padrão de DJ, modo padrão da agenda, etc.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
