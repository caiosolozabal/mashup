
'use client';

import { useEffect, useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, List, Loader2 } from 'lucide-react';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import type { Event, UserDetails } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/useAuth';
import ScheduleCalendarView from '@/components/schedule/ScheduleCalendarView';
import ScheduleListView from '@/components/schedule/ScheduleListView';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format, parseISO } from 'date-fns';
import type { DateRange } from 'react-day-picker';

type ViewMode = 'month' | 'week' | 'list';

export default function SchedulePage() {
  const { user, userDetails, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('list'); // Default to list view
  
  // Filters
  const [selectedDjId, setSelectedDjId] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState('');
  const [allDjs, setAllDjs] = useState<{ id: string; name: string }[]>([]);


  useEffect(() => {
    const fetchEventsAndDjs = async () => {
      if (authLoading || !user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      try {
        if (!db) throw new Error("Firestore not initialized");
        const eventsCollection = collection(db, 'events');
        let q;

        if (userDetails?.role === 'admin' || userDetails?.role === 'partner') {
          q = query(eventsCollection, orderBy('data_evento', 'asc'));
        } else if (userDetails?.role === 'dj') {
          q = query(eventsCollection, where('dj_id', '==', user.uid), orderBy('data_evento', 'asc'));
        } else {
          setEvents([]);
          setIsLoading(false);
          return;
        }
        
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
            files: Array.isArray(data.files) ? data.files.map(file => ({
              ...file,
              uploadedAt: file.uploadedAt instanceof Timestamp ? file.uploadedAt.toDate() : new Date(file.uploadedAt)
            })) : [],
          } as Event;
        });
        setEvents(eventsList);

        // Extract unique DJs for filter (only for admin/partner)
        if (userDetails?.role === 'admin' || userDetails?.role === 'partner') {
          const djMap = new Map<string, string>();
          // Populate from users collection if available, fallback to events
           const usersCollection = collection(db, 'users');
           const djsQuery = query(usersCollection, where('role', '==', 'dj'));
           const djsSnapshot = await getDocs(djsQuery);
           djsSnapshot.docs.forEach(doc => {
             const djData = doc.data() as UserDetails;
             djMap.set(djData.uid, djData.displayName || djData.email || 'DJ Desconhecido');
           });
           // Fallback if no users found, populate from events (less ideal)
           if (djMap.size === 0) {
             eventsList.forEach(event => {
               if (event.dj_id && event.dj_nome) {
                 djMap.set(event.dj_id, event.dj_nome);
               }
             });
           }
          setAllDjs(Array.from(djMap, ([id, name]) => ({ id, name })).sort((a,b) => a.name.localeCompare(b.name)));
        }

      } catch (error) {
        console.error("Error fetching events: ", error);
        // Add toast notification for error
      } finally {
        setIsLoading(false);
      }
    };

    fetchEventsAndDjs();
  }, [user, authLoading, userDetails?.role]);

  const filteredEvents = useMemo(() => {
    let filtered = [...events];

    if (selectedDjId !== 'all' && (userDetails?.role === 'admin' || userDetails?.role === 'partner')) {
      filtered = filtered.filter(event => event.dj_id === selectedDjId);
    }

    if (dateRange?.from) {
      filtered = filtered.filter(event => event.data_evento >= dateRange.from!);
    }
    if (dateRange?.to) {
       // Adjust 'to' date to include the whole day
      const toDate = new Date(dateRange.to);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(event => event.data_evento <= toDate);
    }

    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      filtered = filtered.filter(event => 
        event.nome_evento.toLowerCase().includes(lowerSearchTerm) ||
        event.contratante_nome.toLowerCase().includes(lowerSearchTerm) ||
        event.local.toLowerCase().includes(lowerSearchTerm)
      );
    }
    return filtered;
  }, [events, selectedDjId, dateRange, searchTerm, userDetails?.role]);


  if (authLoading || (isLoading && events.length === 0)) { // Show loader if authLoading or initial data loading
    return (
        <div className="flex flex-col justify-center items-center h-64 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando agenda...</p>
        </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <CardTitle className="font-headline text-2xl">Agenda de Eventos</CardTitle>
            <div className="flex gap-2">
              <Button variant={viewMode === 'list' ? 'default' : 'outline'} onClick={() => setViewMode('list')} size="sm">
                <List className="mr-2 h-4 w-4" /> Lista de Eventos
              </Button>
              <Button variant={viewMode === 'month' ? 'default' : 'outline'} onClick={() => setViewMode('month')} size="sm">
                <CalendarDays className="mr-2 h-4 w-4" /> Calendário Mensal
              </Button>
              {/* Placeholder for Week View Button */}
              {/* <Button variant={viewMode === 'week' ? 'default' : 'outline'} onClick={() => setViewMode('week')} size="sm" disabled>
                Semanal
              </Button> */}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter Section */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
            <Input 
              placeholder="Buscar por evento, contratante, local..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="lg:col-span-2"
            />
             <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className="w-full justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Selecione o período</span>
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
            {(userDetails?.role === 'admin' || userDetails?.role === 'partner') && (
              <Select value={selectedDjId} onValueChange={setSelectedDjId} disabled={allDjs.length === 0}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por DJ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os DJs</SelectItem>
                  {allDjs.map(dj => (
                    <SelectItem key={dj.id} value={dj.id}>{dj.name}</SelectItem>
                  ))}
                   {allDjs.length === 0 && <SelectItem value="no-djs" disabled>Nenhum DJ cadastrado</SelectItem>}
                </SelectContent>
              </Select>
            )}
          </div>

          {isLoading && events.length > 0 && ( // Show loader on top if reloading data but some data already exists
             <div className="flex justify-center items-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <p className="ml-2 text-sm text-muted-foreground">Atualizando eventos...</p>
             </div>
          )}

          {viewMode === 'month' && <ScheduleCalendarView events={filteredEvents} />}
          {viewMode === 'list' && <ScheduleListView events={filteredEvents} djPercentual={userDetails?.dj_percentual ?? null} />}
          {/* Placeholder for Week View Component */}
          {/* {viewMode === 'week' && <div>Visualização Semanal (a ser implementada)</div>} */}
          
          {filteredEvents.length === 0 && !isLoading && (
             <p className="text-center text-muted-foreground py-8">Nenhum evento encontrado para os filtros selecionados.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
