'use client';

import type { NextPage } from 'next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, badgeVariants } from '@/components/ui/badge';
import type { Event, UserDetails } from '@/lib/types';
import { format, parseISO, startOfMonth, endOfMonth, subDays, startOfYear, endOfYear } from 'date-fns';
import { CalendarIcon, Search, Loader2 } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';
import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import EventView from '@/components/events/EventView'; // Assuming you might want to view event details
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';


const getStatusVariant = (status?: Event['status_pagamento']): VariantProps<typeof badgeVariants>['variant'] => {
  switch (status) {
    case 'pago': return 'default';
    case 'parcial': return 'secondary';
    case 'pendente': return 'outline';
    case 'vencido': return 'destructive';
    case 'cancelado': return 'destructive';
    default: return 'outline';
  }
};

const getStatusText = (status?: Event['status_pagamento']): string => {
  switch (status) {
    case 'pago': return 'Pago';
    case 'parcial': return 'Parcial';
    case 'pendente': return 'Pendente';
    case 'vencido': return 'Vencido';
    case 'cancelado': return 'Cancelado';
    default: return status || 'N/A';
  }
};

interface FinancialSummary {
  totalEvents: number;
  totalGrossCacheValue: number; // Sum of event.valor_total
  totalDjNetShareAccrued: number; // Sum of DJ's net share for all relevant events ( (valor_total * %) - custos )
  totalDjCosts: number; // Sum of event.dj_costs

  // Detailed breakdown for the selected DJ
  djNetShareFromPaidToAgency: number; // DJ's share from events fully paid by client to agency
  djNetShareFromPaidToDj: number; // DJ's actual keep from events fully paid by client to DJ (already has their share)
  
  agencyShareFromPaidToDj: number; // Agency's share from events fully paid by client to DJ (DJ needs to repass this)

  djShareFromPendingToAgency: number; // DJ's potential share from events pending/partial payment to agency
  agencyShareFromPendingToDj: number; // Agency's potential share from events pending/partial payment to DJ

  // Simplified final balances based on 'pago' status
  balanceOwedToDjByAgency: number; // Based on events PAID to AGENCY
  balanceOwedToAgencyByDj: number; // Based on events PAID to DJ
}


const PaymentsPage: NextPage = () => {
  const { user, userDetails, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isViewEventOpen, setIsViewEventOpen] = useState(false);
  const [selectedEventForView, setSelectedEventForView] = useState<Event | null>(null);

  // Filters
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDjId, setSelectedDjId] = useState<string>('all'); // 'all' or a specific DJ UID
  const [allDjs, setAllDjs] = useState<UserDetails[]>([]);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('month');


  // Fetch all DJs for admin/partner filter
  useEffect(() => {
    const fetchDjs = async () => {
      if (!db || !(userDetails?.role === 'admin' || userDetails?.role === 'partner')) {
        setAllDjs([]);
        return;
      }
      try {
        const djsQuery = query(collection(db, 'users'), where('role', '==', 'dj'), orderBy('displayName'));
        const djsSnapshot = await getDocs(djsQuery);
        const djsList = djsSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserDetails));
        setAllDjs(djsList);
      } catch (error) {
        console.error("Error fetching DJs: ", error);
        toast({ variant: 'destructive', title: 'Erro ao buscar DJs', description: (error as Error).message });
      }
    };
    fetchDjs();
  }, [userDetails?.role, toast]);

  // Fetch events based on role and selected DJ
  useEffect(() => {
    const fetchEvents = async () => {
      if (authLoading || !user || !db) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      
      let q;
      const eventsCollectionRef = collection(db, 'events');

      if (userDetails?.role === 'admin' || userDetails?.role === 'partner') {
        if (selectedDjId === 'all') {
          q = query(eventsCollectionRef, orderBy('data_evento', 'desc'));
        } else {
          q = query(eventsCollectionRef, where('dj_id', '==', selectedDjId), orderBy('data_evento', 'desc'));
        }
      } else if (userDetails?.role === 'dj') {
        q = query(eventsCollectionRef, where('dj_id', '==', user.uid), orderBy('data_evento', 'desc'));
        setSelectedDjId(user.uid); // Ensure DJ's own ID is selected
      } else {
        setAllEvents([]);
        setIsLoading(false);
        return;
      }

      try {
        const eventsSnapshot = await getDocs(q);
        const eventsList = eventsSnapshot.docs.map(docSnapshot => {
          const data = docSnapshot.data();
          return {
            id: docSnapshot.id,
            ...data,
            data_evento: data.data_evento instanceof Timestamp ? data.data_evento.toDate() : new Date(data.data_evento),
            created_at: data.created_at instanceof Timestamp ? data.created_at.toDate() : new Date(data.created_at),
            updated_at: data.updated_at && (data.updated_at instanceof Timestamp ? data.updated_at.toDate() : new Date(data.updated_at)),
            payment_proofs: Array.isArray(data.payment_proofs) ? data.payment_proofs.map(proof => ({
              ...proof,
              uploadedAt: proof.uploadedAt instanceof Timestamp ? proof.uploadedAt.toDate() : new Date(proof.uploadedAt)
            })) : [],
          } as Event;
        });
        setAllEvents(eventsList);
      } catch (error) {
        console.error("Error fetching events for payments: ", error);
        toast({ variant: 'destructive', title: 'Erro ao buscar eventos', description: (error as Error).message });
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [user, authLoading, userDetails?.role, selectedDjId, toast]);

  const filteredEvents = useMemo(() => {
    let eventsToFilter = [...allEvents];
    if (dateRange?.from) {
      eventsToFilter = eventsToFilter.filter(event => event.data_evento >= dateRange.from!);
    }
    if (dateRange?.to) {
      const toDate = new Date(dateRange.to!);
      toDate.setHours(23, 59, 59, 999); // Include the whole 'to' day
      eventsToFilter = eventsToFilter.filter(event => event.data_evento <= toDate);
    }
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      eventsToFilter = eventsToFilter.filter(event =>
        event.nome_evento.toLowerCase().includes(lowerSearch) ||
        event.contratante_nome.toLowerCase().includes(lowerSearch) ||
        event.local.toLowerCase().includes(lowerSearch)
      );
    }
    // Filter out cancelled events for financial calculations
    return eventsToFilter.filter(event => event.status_pagamento !== 'cancelado');
  }, [allEvents, dateRange, searchTerm]);


  const calculateFinancialSummary = useMemo((): FinancialSummary | null => {
    let djForSummary: UserDetails | undefined = undefined;

    if (userDetails?.role === 'dj') {
      djForSummary = userDetails;
    } else if ((userDetails?.role === 'admin' || userDetails?.role === 'partner') && selectedDjId !== 'all') {
      djForSummary = allDjs.find(dj => dj.uid === selectedDjId);
    }

    if (!djForSummary || !djForSummary.dj_percentual) return null;

    const djBasePercentage = djForSummary.dj_percentual;

    const summary: FinancialSummary = {
      totalEvents: 0,
      totalGrossCacheValue: 0,
      totalDjNetShareAccrued: 0,
      totalDjCosts: 0,
      djNetShareFromPaidToAgency: 0,
      djNetShareFromPaidToDj: 0,
      agencyShareFromPaidToDj: 0,
      djShareFromPendingToAgency: 0,
      agencyShareFromPendingToDj: 0,
      balanceOwedToDjByAgency: 0,
      balanceOwedToAgencyByDj: 0,
    };

    filteredEvents.forEach(event => {
      // Ensure event is for the DJ we are summarizing or skip
      if (event.dj_id !== djForSummary!.uid) return;

      summary.totalEvents += 1;
      summary.totalGrossCacheValue += event.valor_total;
      const djCosts = event.dj_costs || 0;
      summary.totalDjCosts += djCosts;

      const djGrossShareBeforeCosts = event.valor_total * djBasePercentage;
      const djNetShare = djGrossShareBeforeCosts - djCosts;
      summary.totalDjNetShareAccrued += djNetShare;
      
      const agencyNetShare = event.valor_total - djNetShare - djCosts;


      if (event.status_pagamento === 'pago') {
        if (event.conta_que_recebeu === 'agencia') {
          summary.djNetShareFromPaidToAgency += djNetShare;
          summary.balanceOwedToDjByAgency += djNetShare;
        } else if (event.conta_que_recebeu === 'dj') {
          summary.djNetShareFromPaidToDj += djNetShare; // DJ already has this (their net part)
          summary.agencyShareFromPaidToDj += agencyNetShare; // This is what DJ owes agency
          summary.balanceOwedToAgencyByDj += agencyNetShare;
        }
      } else if (event.status_pagamento === 'pendente' || event.status_pagamento === 'parcial') {
        // For pending/parcial, we note potential shares once client pays
        if (event.conta_que_recebeu === 'agencia') {
          summary.djShareFromPendingToAgency += djNetShare;
        } else if (event.conta_que_recebeu === 'dj') {
          summary.agencyShareFromPendingToDj += agencyNetShare;
        }
      }
    });
    return summary;
  }, [filteredEvents, userDetails, selectedDjId, allDjs]);

  const handleQuickFilter = (filter: 'month' | 'last30' | 'year') => {
    setActiveQuickFilter(filter);
    const today = new Date();
    if (filter === 'month') {
      setDateRange({ from: startOfMonth(today), to: endOfMonth(today) });
    } else if (filter === 'last30') {
      setDateRange({ from: subDays(today, 29), to: today }); // 29 to include today makes it 30 days
    } else if (filter === 'year') {
      setDateRange({ from: startOfYear(today), to: endOfYear(today) });
    }
  };
  
  const handleOpenEventView = (event: Event) => {
    setSelectedEventForView(event);
    setIsViewEventOpen(true);
  };


  if (authLoading) {
    return (
        <div className="flex flex-col justify-center items-center h-64 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando dados financeiros...</p>
        </div>
    );
  }
  
  const showDetailedSummary = !!((userDetails?.role === 'dj') || ((userDetails?.role === 'admin' || userDetails?.role === 'partner') && selectedDjId !== 'all' && calculateFinancialSummary));


  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Financeiro e Pagamentos</CardTitle>
          <CardDescription>Acompanhe os recebimentos, pagamentos e saldos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Filters Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end p-4 border rounded-lg bg-muted/30 shadow-sm">
            <div className="lg:col-span-2">
              <label htmlFor="search-payments" className="text-sm font-medium text-foreground">Buscar Evento</label>
              <Input
                id="search-payments"
                placeholder="Nome, contratante, local..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-background"
              />
            </div>
            <div>
              <label htmlFor="date-range-payments" className="text-sm font-medium text-foreground">Período</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="date-range-payments"
                    variant={"outline"}
                    className="w-full justify-start text-left font-normal bg-background"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, "dd/MM/yy")} - {format(dateRange.to, "dd/MM/yy")}
                        </>
                      ) : (
                        format(dateRange.from, "dd/MM/yy")
                      )
                    ) : (
                      <span>Selecione</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-end gap-1">
                <Button onClick={() => handleQuickFilter('month')} variant={activeQuickFilter === 'month' ? 'default' : 'outline'} size="sm" className="flex-1">Mês</Button>
                <Button onClick={() => handleQuickFilter('last30')} variant={activeQuickFilter === 'last30' ? 'default' : 'outline'} size="sm" className="flex-1">30d</Button>
                <Button onClick={() => handleQuickFilter('year')} variant={activeQuickFilter === 'year' ? 'default' : 'outline'} size="sm" className="flex-1">Ano</Button>
            </div>

            {(userDetails?.role === 'admin' || userDetails?.role === 'partner') && (
              <div className="lg:col-span-1">
                <label htmlFor="dj-filter-payments" className="text-sm font-medium text-foreground">Filtrar por DJ</label>
                <Select value={selectedDjId} onValueChange={setSelectedDjId} disabled={allDjs.length === 0}>
                  <SelectTrigger id="dj-filter-payments" className="bg-background">
                    <SelectValue placeholder="Selecione um DJ" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os DJs</SelectItem>
                    {allDjs.map(dj => (
                      <SelectItem key={dj.uid} value={dj.uid}>{dj.displayName || dj.email}</SelectItem>
                    ))}
                    {allDjs.length === 0 && <SelectItem value="no-djs" disabled>Nenhum DJ cadastrado</SelectItem>}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Financial Summary Section */}
          {isLoading && !calculateFinancialSummary && (
             <div className="flex justify-center items-center py-6">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Calculando resumo...</p>
             </div>
          )}

          {showDetailedSummary && calculateFinancialSummary && (
            <Card className="bg-primary/5 border-primary/20 shadow-md">
              <CardHeader>
                <CardTitle className="font-headline text-xl text-primary">
                    Resumo Financeiro: {allDjs.find(dj => dj.uid === selectedDjId)?.displayName || userDetails?.displayName}
                </CardTitle>
                <CardDescription>Referente ao período e filtros selecionados.</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                <div className="p-3 bg-background/70 rounded-md shadow-sm">
                  <p className="text-muted-foreground">Total de Eventos no Período:</p>
                  <p className="font-semibold text-lg">{calculateFinancialSummary.totalEvents}</p>
                </div>
                <div className="p-3 bg-background/70 rounded-md shadow-sm">
                  <p className="text-muted-foreground">Soma Bruta dos Cachês (Eventos):</p>
                  <p className="font-semibold text-lg">{calculateFinancialSummary.totalGrossCacheValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="p-3 bg-background/70 rounded-md shadow-sm">
                  <p className="text-muted-foreground">Total Custos do DJ (Declarados):</p>
                  <p className="font-semibold text-lg">{calculateFinancialSummary.totalDjCosts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="p-3 bg-background/70 rounded-md shadow-sm">
                  <p className="text-muted-foreground">Total Líquido Acumulado para DJ:</p>
                  <p className="font-semibold text-lg text-green-600">{calculateFinancialSummary.totalDjNetShareAccrued.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                  <p className="text-xs text-muted-foreground">(Soma de (% do valor total) - custos)</p>
                </div>

                <div className="p-3 bg-background/70 rounded-md shadow-sm col-span-1 md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <p className="text-muted-foreground text-blue-700">Valor a Receber pelo DJ (Agência já recebeu do cliente):</p>
                        <p className="font-semibold text-lg text-blue-700">{calculateFinancialSummary.balanceOwedToDjByAgency.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        <p className="text-xs text-muted-foreground">(Eventos com status 'Pago' para 'agencia')</p>
                    </div>
                     <div>
                        <p className="text-muted-foreground text-orange-600">Valor a Repassar à Agência (DJ já recebeu do cliente):</p>
                        <p className="font-semibold text-lg text-orange-600">{calculateFinancialSummary.balanceOwedToAgencyByDj.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                        <p className="text-xs text-muted-foreground">(Eventos com status 'Pago' para 'dj')</p>
                    </div>
                </div>
                 <div className="p-3 bg-background/70 rounded-md shadow-sm">
                  <p className="text-muted-foreground">DJ Share (Cliente Pagou Agência):</p>
                  <p className="font-semibold">{calculateFinancialSummary.djNetShareFromPaidToAgency.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="p-3 bg-background/70 rounded-md shadow-sm">
                  <p className="text-muted-foreground">DJ Recebeu Direto (Cliente Pagou DJ):</p>
                  <p className="font-semibold">{calculateFinancialSummary.djNetShareFromPaidToDj.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                 <div className="p-3 bg-background/70 rounded-md shadow-sm">
                  <p className="text-muted-foreground">Agência a Receber (DJ Recebeu do Cliente):</p>
                  <p className="font-semibold">{calculateFinancialSummary.agencyShareFromPaidToDj.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>

                 <div className="p-3 bg-background/70 rounded-md shadow-sm">
                  <p className="text-muted-foreground">DJ Share Pendente (Cliente não pagou Agência):</p>
                  <p className="font-semibold">{calculateFinancialSummary.djShareFromPendingToAgency.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div className="p-3 bg-background/70 rounded-md shadow-sm">
                  <p className="text-muted-foreground">Agência Share Pendente (Cliente não pagou DJ):</p>
                  <p className="font-semibold">{calculateFinancialSummary.agencyShareFromPendingToDj.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>

              </CardContent>
            </Card>
          )}
          
          {/* Events List / Extract Section */}
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Extrato de Eventos</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading && filteredEvents.length === 0 ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <p className="ml-2">Carregando eventos...</p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhum evento encontrado para os filtros selecionados.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Evento</TableHead>
                        {showDetailedSummary && userDetails?.dj_percentual && (
                          <>
                            <TableHead className="text-right">Valor Total</TableHead>
                            <TableHead className="text-right">% DJ</TableHead>
                            <TableHead className="text-right">Custos DJ</TableHead>
                            <TableHead className="text-right">Valor Líquido DJ</TableHead>
                          </>
                        )}
                        {(!showDetailedSummary || !userDetails?.dj_percentual) && ( // Admin view all or DJ has no percentage
                            <>
                                <TableHead>DJ Atribuído</TableHead>
                                <TableHead className="text-right">Valor Total</TableHead>
                            </>
                        )}
                        <TableHead>Recebido Por</TableHead>
                        <TableHead>Status Pag.</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredEvents.map((event) => {
                        const djForEvent = allDjs.find(d => d.uid === event.dj_id) || (userDetails?.uid === event.dj_id ? userDetails : null);
                        const djPercent = djForEvent?.dj_percentual ?? 0;
                        const djNetValue = (event.valor_total * djPercent) - (event.dj_costs || 0);
                        
                        return (
                          <TableRow key={event.id}>
                            <TableCell>{format(event.data_evento, 'dd/MM/yy')}</TableCell>
                            <TableCell className="font-medium max-w-xs truncate" title={event.nome_evento}>{event.nome_evento}</TableCell>
                            
                            {showDetailedSummary && userDetails?.dj_percentual && (
                                <>
                                    <TableCell className="text-right">{Number(event.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                    <TableCell className="text-right">{(djPercent * 100).toFixed(0)}%</TableCell>
                                    <TableCell className="text-right">{Number(event.dj_costs || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                    <TableCell className="text-right font-semibold">{djNetValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                </>
                            )}
                            {(!showDetailedSummary || !userDetails?.dj_percentual) && (
                                <>
                                    <TableCell>{event.dj_nome}</TableCell>
                                    <TableCell className="text-right">{Number(event.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</TableCell>
                                </>
                            )}

                            <TableCell className="capitalize">{event.conta_que_recebeu}</TableCell>
                            <TableCell>
                              <Badge variant={getStatusVariant(event.status_pagamento)} className="capitalize text-xs">
                                {getStatusText(event.status_pagamento)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                                <Button variant="outline" size="sm" onClick={() => handleOpenEventView(event)}>Ver Detalhes</Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial Closures Section - Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-xl">Fechamentos Financeiros</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                A funcionalidade de fechamentos financeiros (para registrar acertos entre agência e DJs) será implementada aqui.
              </p>
              {/* TODO: List existing closures, button to create new closure (admin/partner) */}
            </CardContent>
          </Card>
        </CardContent>
      </Card>

      {/* Event View Dialog */}
      <Dialog open={isViewEventOpen} onOpenChange={(open) => { setIsViewEventOpen(open); if (!open) setSelectedEventForView(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento: {selectedEventForView?.nome_evento}</DialogTitle>
          </DialogHeader>
          <EventView event={selectedEventForView} />
           <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewEventOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PaymentsPage;

// TODO:
// - Implement "Comprovante" button/logic in the event list.
// - Implement "Fechamentos Financeiros" section.
// - Consider onSnapshot for real-time updates if necessary.
// - Further UI refinements and mobile responsiveness checks.
// - Handle cases where dj_percentual might be missing for a DJ.
// - More robust error handling during calculations.
// - Add "Eventos criados por mim" filter if needed.
// - Add filter by payment status.
// - Admins/Partners should be able to see a summary for "all djs" or it should be a different kind of summary.

