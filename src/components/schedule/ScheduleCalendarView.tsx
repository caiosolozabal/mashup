
'use client';

import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import type { Event } from '@/lib/types';
import { format, isSameDay } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import EventView from '@/components/events/EventView';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { buttonVariants } from "@/components/ui/button"


interface ScheduleCalendarViewProps {
  events: Event[];
}

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

const getEventColorVar = (status?: Event['status_pagamento']): string => {
  switch (status) {
    case 'pago': return '--chart-3'; 
    case 'parcial': return '--chart-4'; 
    case 'pendente': return '--destructive'; 
    case 'vencido': return '--destructive'; 
    case 'cancelado': return '--muted'; 
    default: return '--foreground'; 
  }
};

export default function ScheduleCalendarView({ events }: ScheduleCalendarViewProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedEventForView, setSelectedEventForView] = useState<Event | null>(null);

  const handleEventClick = (event: Event) => {
    setSelectedEventForView(event);
    setIsViewOpen(true);
  };

  const DayContent = (props: { date: Date }) => {
    const dayEvents = events.filter(eventItem => eventItem.data_evento && isSameDay(eventItem.data_evento, props.date));
    const MAX_VISIBLE_EVENTS = 2; 
    
    const renderDateNumber = () => (
      <span className={`absolute top-1 left-1 text-xs ${isSameDay(props.date, new Date()) ? 'font-bold text-primary' : 'text-muted-foreground'}`}>
        {format(props.date, 'd')}
      </span>
    );

    return (
      <TooltipProvider>
        <div className="flex flex-col items-stretch justify-start w-full h-full relative pt-5 px-1 space-y-0.5 overflow-hidden">
          {renderDateNumber()}
          {dayEvents.slice(0, MAX_VISIBLE_EVENTS).map(event => (
            <Tooltip key={event.id} delayDuration={100}>
              <TooltipTrigger asChild>
                <div
                  onClick={() => handleEventClick(event)}
                  className={cn(
                    "text-[10px] leading-tight p-1 rounded-sm cursor-pointer hover:opacity-80 w-full text-left truncate text-white font-medium"
                  )}
                  style={{ backgroundColor: `hsl(var(${getEventColorVar(event.status_pagamento)}))` }}
                  title={`${event.nome_evento} (${getStatusText(event.status_pagamento)})`}
                >
                  {event.horario_inicio ? `${event.horario_inicio.substring(0,5)} - ` : ''}{event.nome_evento}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top" className="p-2 text-xs bg-background border-border shadow-lg rounded-md">
                <p className="font-semibold">{event.nome_evento}</p>
                {event.horario_inicio && <p>{event.horario_inicio}{event.horario_fim ? ` - ${event.horario_fim}`: ''}</p>}
                <p className="capitalize">{getStatusText(event.status_pagamento)}</p>
              </TooltipContent>
            </Tooltip>
          ))}
          {dayEvents.length > MAX_VISIBLE_EVENTS && (
            <div
              className="text-[10px] text-center text-muted-foreground py-0.5 cursor-pointer hover:underline mt-auto"
              onClick={() => {
                if (dayEvents.length > 0) {
                    handleEventClick(dayEvents[0]); 
                }
              }}
              title={`Ver todos os ${dayEvents.length} eventos`}
            >
              +{dayEvents.length - MAX_VISIBLE_EVENTS} mais
            </div>
          )}
           {dayEvents.length === 0 && (
            <div className="flex-grow w-full"> </div>
          )}
        </div>
      </TooltipProvider>
    );
  };
  
  const today = new Date();

  return (
    <>
      <div className="w-full"> {/* Explicit wrapper to ensure Calendar can take full width */}
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          className="rounded-md border shadow-sm w-full" // Relies on ui/calendar for p-3, ensures w-full
          month={selectedDate}
          onMonthChange={setSelectedDate}
          components={{
            DayContent: DayContent,
          }}
          modifiers={{
              today: today,
          }}
          modifiersClassNames={{
              today: 'border-2 border-primary rounded-md', 
          }}
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4 w-full", // Ensure month container tries to be full width
            caption: "flex justify-center pt-1 relative items-center",
            caption_label: "text-sm font-medium",
            nav: "space-x-1 flex items-center",
            nav_button: cn(
              buttonVariants({ variant: "outline" }),
              "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
            ),
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            
            table: "w-full border-collapse", // Table should take full width of its parent (month)
            head_row: "flex w-full", 
            head_cell: "flex-1 text-muted-foreground rounded-md font-normal text-[0.8rem] text-center p-1",
            
            row: "flex w-full mt-1",
            cell: "flex-1 h-24 text-sm relative focus-within:relative focus-within:z-20 border-t border-border p-0", 
            
            day: cn(
              buttonVariants({ variant: "ghost" }), 
              "h-full w-full p-0 font-normal aria-selected:opacity-100 flex items-stretch justify-stretch" 
            ),
            day_selected: "bg-primary/10 text-primary ring-1 ring-primary/50",
            day_today: "bg-transparent text-foreground", 
            day_outside: "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
            day_disabled: "text-muted-foreground opacity-50",
            day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
            day_hidden: "invisible",
          }}
        />
      </div>
       <Dialog open={isViewOpen} onOpenChange={(open) => { setIsViewOpen(open); if (!open) setSelectedEventForView(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento: {selectedEventForView?.nome_evento}</DialogTitle>
          </DialogHeader>
          <EventView event={selectedEventForView} />
           <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
