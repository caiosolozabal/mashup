
'use client';

import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import type { Event } from '@/lib/types';
import { format, isSameDay } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import type { VariantProps } from 'class-variance-authority';
import { badgeVariants } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import EventView from '@/components/events/EventView';
import { Button } from '@/components/ui/button';

interface ScheduleCalendarViewProps {
  events: Event[];
}

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
    
    const renderDateNumber = () => (
      <span className={`absolute top-0.5 left-0.5 text-xs ${isSameDay(props.date, new Date()) ? 'font-bold' : ''}`}>
        {format(props.date, 'd')}
      </span>
    );

    if (dayEvents.length === 0) {
      return <div className="flex items-center justify-center w-full h-full relative">{renderDateNumber()}</div>;
    }

    return (
      <TooltipProvider>
        <div className="flex flex-col items-center justify-start w-full h-full pt-1 relative">
          {renderDateNumber()}
          <div className="flex flex-wrap justify-center items-center gap-0.5 mt-3 px-0.5">
            {dayEvents.slice(0, 3).map(event => ( 
              <Tooltip key={event.id} delayDuration={100}>
                <TooltipTrigger asChild>
                  <Badge
                    variant={getStatusVariant(event.status_pagamento)}
                    className="p-0.5 h-2 w-2 cursor-pointer hover:opacity-75"
                    onClick={() => handleEventClick(event)}
                    aria-label={`Evento: ${event.nome_evento}`}
                  />
                </TooltipTrigger>
                <TooltipContent side="top" className="p-2 text-xs bg-background border-border shadow-lg rounded-md">
                  <p className="font-semibold">{event.nome_evento}</p>
                  {event.horario_inicio && <p>{event.horario_inicio}{event.horario_fim ? ` - ${event.horario_fim}`: ''}</p>}
                  <p className="capitalize">{getStatusText(event.status_pagamento)}</p>
                </TooltipContent>
              </Tooltip>
            ))}
            {dayEvents.length > 3 && (
              <span className="text-xs text-muted-foreground leading-tight">+{dayEvents.length - 3}</span>
            )}
          </div>
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
            today: 'text-primary font-bold border-primary',
        }}
        classNames={{
          day: "h-14 w-14 text-sm p-1", // Adjust cell size
          day_selected: "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
          head_cell: "text-muted-foreground rounded-md w-14 font-normal text-[0.8rem]",
          cell: "h-14 w-14 text-center text-sm p-0 relative first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
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
