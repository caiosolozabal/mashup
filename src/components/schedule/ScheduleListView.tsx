
'use client';

import type { Event } from '@/lib/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';
import type { VariantProps } from 'class-variance-authority';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import EventView from '@/components/events/EventView';
import { useState } from 'react';
import { Button } from '../ui/button';

interface ScheduleListViewProps {
  events: Event[];
  djPercentual: number | null; // Pass the DJ's percentage for cache calculation
}

const getStatusVariant = (status?: Event['status_pagamento']): VariantProps<typeof badgeVariants>['variant'] => {
  switch (status) {
    case 'pago': return 'default'; // Green in default theme for "Pago" might need adjustment
    case 'parcial': return 'secondary'; // Yellowish/Grey
    case 'pendente': return 'outline'; // Greyish
    case 'vencido': return 'destructive'; // Red
    case 'cancelado': return 'destructive'; // Red
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

export default function ScheduleListView({ events, djPercentual }: ScheduleListViewProps) {
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  const handleOpenView = (event: Event) => {
    setSelectedEvent(event);
    setIsViewOpen(true);
  };

  const calculateCache = (event: Event): number => {
    if (typeof djPercentual !== 'number' || djPercentual < 0 || djPercentual > 1) {
      return 0; // Or handle as an error/unknown state
    }
    // This calculation assumes djPercentual is the DJ's cut (e.g., 0.7 for 70%)
    // and does not yet consider 'conta_que_recebeu'.
    // A more complex logic will be needed for final financial settlement.
    return event.valor_total * djPercentual;
  };


  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Horário</TableHead>
              <TableHead>Evento</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Contratante</TableHead>
              <TableHead>Status Pag.</TableHead>
              <TableHead>Valor Total</TableHead>
              {djPercentual !== null && <TableHead>Seu Cachê (Est.)</TableHead>}
              <TableHead>DJ</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id} onClick={() => handleOpenView(event)} className="cursor-pointer">
                <TableCell>
                  <div className="font-medium">{format(event.data_evento, 'dd/MM/yyyy')}</div>
                  <div className="text-xs text-muted-foreground">{event.dia_da_semana}</div>
                </TableCell>
                <TableCell>
                    {event.horario_inicio ? `${event.horario_inicio}${event.horario_fim ? ` - ${event.horario_fim}` : ''}` : 'N/A'}
                </TableCell>
                <TableCell className="font-medium">{event.nome_evento}</TableCell>
                <TableCell>{event.local}</TableCell>
                <TableCell>{event.contratante_nome}</TableCell>
                <TableCell>
                  <Badge variant={getStatusVariant(event.status_pagamento)} className="capitalize text-xs">
                    {getStatusText(event.status_pagamento)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {Number(event.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </TableCell>
                {djPercentual !== null && (
                  <TableCell>
                    {calculateCache(event).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </TableCell>
                )}
                <TableCell>{event.dj_nome}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isViewOpen} onOpenChange={(open) => { setIsViewOpen(open); if (!open) setSelectedEvent(null); }}>
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento: {selectedEvent?.nome_evento}</DialogTitle>
          </DialogHeader>
          <EventView event={selectedEvent} />
           <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
