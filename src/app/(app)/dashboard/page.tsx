
'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { BarChart, CalendarClock, ListChecks, Users, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp, startOfMonth, endOfMonth } from 'firebase/firestore';
import type { Event, UserDetails } from '@/lib/types';
import { format } from 'date-fns';
import Link from 'next/link';

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  description?: string;
}

interface DashboardEvent {
  id: string;
  nome_evento: string;
  local: string;
  data_evento: Date;
  horario_inicio?: string | null;
  status_pagamento?: Event['status_pagamento'];
  created_at?: Date;
  updated_at?: Date;
}

export default function DashboardPage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<StatCard[]>([]);
  const [recentActivities, setRecentActivities] = useState<DashboardEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<DashboardEvent[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      if (!db) {
        console.error("Firestore not initialized");
        setIsLoading(false);
        // Initialize stats with error messages or zeros
        setStats([
          { title: 'Eventos Ativos', value: 'Erro', icon: CalendarClock, color: 'text-destructive' },
          { title: 'Total de DJs', value: 'Erro', icon: Users, color: 'text-destructive' },
          { title: 'Próximos Eventos', value: 'Erro', icon: ListChecks, color: 'text-destructive' },
          { title: 'Receita (Mês)', value: 'Erro', icon: BarChart, color: 'text-destructive' },
        ]);
        return;
      }

      try {
        // Fetch all non-cancelled events
        const eventsCollectionRef = collection(db, 'events');
        const allEventsQuery = query(eventsCollectionRef, where('status_pagamento', '!=', 'cancelado'));
        const allEventsSnapshot = await getDocs(allEventsQuery);
        const allEventsList = allEventsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            data_evento: data.data_evento instanceof Timestamp ? data.data_evento.toDate() : new Date(data.data_evento),
            created_at: data.created_at instanceof Timestamp ? data.created_at.toDate() : (data.created_at ? new Date(data.created_at) : new Date()),
            updated_at: data.updated_at instanceof Timestamp ? data.updated_at.toDate() : (data.updated_at ? new Date(data.updated_at) : new Date()),
          } as Event;
        });

        // 1. Active Events (all non-cancelled events)
        const activeEventsCount = allEventsList.length;

        // 2. Total DJs
        const usersCollectionRef = collection(db, 'users');
        const djsQuery = query(usersCollectionRef, where('role', '==', 'dj'));
        const djsSnapshot = await getDocs(djsQuery);
        const totalDjsCount = djsSnapshot.size;

        // 3. Upcoming Gigs
        const now = new Date();
        const upcomingGigsCount = allEventsList.filter(event => event.data_evento > now).length;

        // 4. Revenue (Month)
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = endOfMonth(now);
        const monthlyRevenue = allEventsList
          .filter(event => 
            event.data_evento >= currentMonthStart && 
            event.data_evento <= currentMonthEnd &&
            event.status_pagamento === 'pago'
          )
          .reduce((sum, event) => sum + event.valor_total, 0);

        setStats([
          { title: 'Eventos Ativos', value: activeEventsCount, icon: CalendarClock, color: 'text-primary' },
          { title: 'Total de DJs', value: totalDjsCount, icon: Users, color: 'text-accent' },
          { title: 'Próximos Agendamentos', value: upcomingGigsCount, icon: ListChecks, color: 'text-green-500' },
          { title: `Receita (Mês ${format(now, 'MM/yy')})`, value: monthlyRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: BarChart, color: 'text-blue-500' },
        ]);

        // Fetch Recent Activities (last 3 updated/created events, non-cancelled)
        const recentActivityQuery = query(
          eventsCollectionRef, 
          where('status_pagamento', '!=', 'cancelado'),
          orderBy('updated_at', 'desc'), 
          limit(3)
        );
        const recentActivitySnapshot = await getDocs(recentActivityQuery);
        const recentActivitiesList = recentActivitySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            nome_evento: data.nome_evento,
            local: data.local, // Added local for consistency
            data_evento: data.data_evento instanceof Timestamp ? data.data_evento.toDate() : new Date(data.data_evento),
            updated_at: data.updated_at instanceof Timestamp ? data.updated_at.toDate() : new Date(data.updated_at),
            created_at: data.created_at instanceof Timestamp ? data.created_at.toDate() : new Date(data.created_at),
          } as DashboardEvent;
        });
        setRecentActivities(recentActivitiesList);

        // Fetch Upcoming Events (next 3, non-cancelled)
        const upcomingEventsQuery = query(
          eventsCollectionRef, 
          where('status_pagamento', '!=', 'cancelado'),
          where('data_evento', '>', now),
          orderBy('data_evento', 'asc'), 
          limit(3)
        );
        const upcomingEventsSnapshot = await getDocs(upcomingEventsQuery);
        const upcomingEventsList = upcomingEventsSnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            nome_evento: data.nome_evento,
            local: data.local,
            data_evento: data.data_evento instanceof Timestamp ? data.data_evento.toDate() : new Date(data.data_evento),
            horario_inicio: data.horario_inicio,
          } as DashboardEvent;
        });
        setUpcomingEvents(upcomingEventsList);

      } catch (error) {
        console.error("Error fetching dashboard data: ", error);
        toast({ variant: 'destructive', title: 'Erro ao carregar dados', description: (error as Error).message });
        // Set stats to error state
         setStats([
          { title: 'Eventos Ativos', value: 'Erro', icon: CalendarClock, color: 'text-destructive' },
          { title: 'Total de DJs', value: 'Erro', icon: Users, color: 'text-destructive' },
          { title: 'Próximos Eventos', value: 'Erro', icon: ListChecks, color: 'text-destructive' },
          { title: 'Receita (Mês)', value: 'Erro', icon: BarChart, color: 'text-destructive' },
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Added toast to dependencies for future use if needed

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Olá, {user?.displayName || user?.email || 'Usuário'}!
        </h1>
        <p className="text-muted-foreground">
          Aqui está uma visão geral das atividades da sua agência.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-body">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-headline">{stat.value}</div>
              {stat.description && <p className="text-xs text-muted-foreground">{stat.description}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Atividade Recente</CardTitle>
            <CardDescription>Visão geral das últimas atualizações e criações de eventos.</CardDescription>
          </CardHeader>
          <CardContent>
            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.map(activity => (
                  <div key={activity.id} className="flex items-center p-2.5 bg-secondary/50 rounded-md">
                    <CalendarClock className="h-5 w-5 mr-3 text-primary flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-semibold">{activity.nome_evento}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.updated_at && activity.created_at && format(activity.updated_at, 'dd/MM/yy HH:mm') !== format(activity.created_at, 'dd/MM/yy HH:mm') 
                          ? `Atualizado em: ${format(activity.updated_at, 'dd/MM/yyyy HH:mm')}`
                          : `Criado em: ${format(activity.created_at || new Date(), 'dd/MM/yyyy HH:mm')}`}
                      </p>
                    </div>
                     <Button variant="outline" size="sm" asChild className="ml-auto">
                        <Link href={`/events?view=${activity.id}`}>Ver</Link>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground">Nenhuma atividade recente para mostrar.</p>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Próximos Eventos</CardTitle>
            <CardDescription>Uma rápida olhada nos eventos que acontecerão em breve.</CardDescription>
          </CardHeader>
          <CardContent>
             {upcomingEvents.length > 0 ? (
              <div className="space-y-3">
                {upcomingEvents.map(event => (
                  <div key={event.id} className="flex items-center justify-between p-2.5 bg-secondary/50 rounded-md">
                    <div>
                      <p className="font-semibold text-sm">{event.nome_evento}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(event.data_evento, 'dd/MM/yyyy')}
                        {event.horario_inicio ? ` às ${event.horario_inicio}` : ''}
                        {event.local ? ` - ${event.local}` : ''}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/events?view=${event.id}`}>Ver</Link>
                    </Button>
                  </div>
                ))}
              </div>
             ) : (
              <p className="text-muted-foreground">Nenhum próximo evento agendado.</p>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
function toast(arg0: { variant: string; title: string; description: string; }) {
  // This is a placeholder. Ensure you have a toast system like shadcn/ui's useToast.
  console.error("Toast function not fully implemented here:", arg0);
}


    