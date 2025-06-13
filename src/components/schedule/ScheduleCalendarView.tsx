
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
    case 'pago': return '--chart-3'; // Teal
    case 'parcial': return '--chart-4'; // Orange
    case 'pendente': return '--destructive'; // Red
    case 'vencido': return '--destructive'; // Red
    case 'cancelado': return '--muted'; // Grey
    default: return '--foreground'; // Default fallback
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
                  {event.horario_inicio ? `${event.horario_inicio} - ` : ''}{event.nome_evento}
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
              className="text-[10px] text-center text-muted-foreground py-0.5 cursor-pointer hover:underline"
              onClick={() => {
                // For simplicity, clicking "+N more" opens the first event of the day in a modal
                // A more advanced implementation could show a list of all events for the day
                if (dayEvents.length > 0) {
                    handleEventClick(dayEvents[0]); // Or open a modal showing all dayEvents
                }
              }}
              title={`Ver todos os ${dayEvents.length} eventos`}
            >
              +{dayEvents.length - MAX_VISIBLE_EVENTS} mais
            </div>
          )}
           {dayEvents.length === 0 && (
            <div className="flex-grow w-full"> {/* Empty div to ensure cell structure is maintained */} </div>
          )}
        </div>
      </TooltipProvider>
    );
  };
  
  const today = new Date();

  return (
    <>
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={setSelectedDate}
        className="rounded-md border p-0 shadow-sm"
        month={selectedDate}
        onMonthChange={setSelectedDate}
        components={{
          DayContent: DayContent,
        }}
        modifiers={{
            today: today,
        }}
        modifiersClassNames={{
            today: 'border-primary', // Highlights border for today
        }}
        classNames={{
          day: "h-20 w-full text-sm p-0 focus-within:relative focus-within:z-10", // Adjusted cell size, removed p-1 for full control by DayContent
          head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem]",
          cell: "h-20 w-full text-center text-sm p-0 relative first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md", // Ensure cell itself has no padding
          day_selected: "bg-accent/50 text-accent-foreground", // Modified selection style for better visibility of DayContent
          day_today: "bg-transparent", // Today's specific background is handled by renderDateNumber or modifiersClassNames
        }}
      />
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
