
'use client';

import type { NextPage } from 'next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge, badgeVariants } from '@/components/ui/badge';
import type { Event } from '@/lib/types';
import { format } from 'date-fns';
import { PlusCircle, Eye, Edit, Trash2 } from 'lucide-react';
import type { VariantProps } from 'class-variance-authority';

const getDayOfWeek = (date: Date): string => {
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[date.getDay()];
};

// Mock data - TODO: Replace with actual data fetching from Firestore
const mockEvents: Event[] = [
  {
    id: '1',
    data_evento: new Date('2024-08-15T19:00:00'),
    dia_da_semana: getDayOfWeek(new Date('2024-08-15T19:00:00')),
    nome_evento: 'Summer Fest',
    local: 'Beach Club',
    contratante_nome: 'John Doe Productions',
    contratante_contato: 'john@productions.com',
    valor_total: 5000,
    valor_sinal: 2000,
    conta_que_recebeu: 'agencia',
    status_pagamento: 'parcial',
    dj_id: 'dj_alpha_uid',
    dj_nome: 'DJ Alpha',
    created_by: 'admin_uid',
    created_at: new Date(),
    files: [{ id: 'f1', name: 'Contract SF.pdf', type: 'contract', url: '#', uploadedAt: new Date() }],
  },
  {
    id: '2',
    data_evento: new Date('2024-09-01T22:00:00'),
    dia_da_semana: getDayOfWeek(new Date('2024-09-01T22:00:00')),
    nome_evento: 'Tech Night',
    local: 'Warehouse X',
    contratante_nome: 'Underground Events Co.',
    valor_total: 3000,
    valor_sinal: 3000,
    conta_que_recebeu: 'dj',
    status_pagamento: 'pago',
    dj_id: 'dj_gamma_uid',
    dj_nome: 'DJ Gamma',
    created_by: 'partner_uid',
    created_at: new Date(),
  },
  {
    id: '3',
    data_evento: new Date('2024-09-10T14:00:00'),
    dia_da_semana: getDayOfWeek(new Date('2024-09-10T14:00:00')),
    nome_evento: 'Corporate Mixer',
    local: 'Grand Hotel Ballroom',
    contratante_nome: 'Innovate Corp',
    contratante_contato: 'contact@innovate.com',
    valor_total: 2500,
    valor_sinal: 0,
    conta_que_recebeu: 'agencia',
    status_pagamento: 'pendente',
    dj_id: 'dj_epsilon_uid',
    dj_nome: 'DJ Epsilon',
    created_by: 'admin_uid',
    created_at: new Date(),
  },
  {
    id: '4',
    data_evento: new Date('2024-09-20T23:00:00'),
    dia_da_semana: getDayOfWeek(new Date('2024-09-20T23:00:00')),
    nome_evento: 'Birthday Bash',
    local: 'Private Residence',
    contratante_nome: 'Jane Smith',
    valor_total: 1500,
    valor_sinal: 500,
    conta_que_recebeu: 'agencia',
    status_pagamento: 'vencido',
    dj_id: 'dj_zeta_uid',
    dj_nome: 'DJ Zeta',
    created_by: 'dj_zeta_uid',
    created_at: new Date(),
  },
  {
    id: '5',
    data_evento: new Date('2024-10-05T20:00:00'),
    dia_da_semana: getDayOfWeek(new Date('2024-10-05T20:00:00')),
    nome_evento: 'Sunset Vibes',
    local: 'Rooftop Lounge',
    contratante_nome: 'Eve Entertainment',
    valor_total: 4000,
    valor_sinal: 1000,
    conta_que_recebeu: 'dj',
    status_pagamento: 'cancelado',
    dj_id: 'dj_beta_uid',
    dj_nome: 'DJ Beta',
    created_by: 'partner_uid',
    created_at: new Date(),
  },
];

const getStatusVariant = (status: Event['status_pagamento']): VariantProps<typeof badgeVariants>['variant'] => {
  switch (status) {
    case 'pago': return 'default'; 
    case 'parcial': return 'secondary';
    case 'pendente': return 'outline';
    case 'vencido': return 'destructive';
    case 'cancelado': return 'destructive';
    default: return 'outline';
  }
};

const getStatusText = (status: Event['status_pagamento']): string => {
  switch (status) {
    case 'pago': return 'Pago';
    case 'parcial': return 'Parcial';
    case 'pendente': return 'Pendente';
    case 'vencido': return 'Vencido';
    case 'cancelado': return 'Cancelado';
    default: return status;
  }
};

const EventsPage: NextPage = () => {
  // TODO: Implement create event functionality (e.g., open a modal or navigate to a new page)
  const handleCreateEvent = () => {
    console.log('Create new event clicked');
    // For now, just a log. Later, this will open a form/modal.
  };

  // TODO: Implement view, edit, delete event functionality
  // const handleViewEvent = (eventId: string) => console.log('View event:', eventId);
  // const handleEditEvent = (eventId: string) => console.log('Edit event:', eventId);
  // const handleDeleteEvent = (eventId: string) => console.log('Delete event:', eventId);


  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="font-headline text-2xl">Gerenciar Eventos</CardTitle>
            <CardDescription>Visualize, crie e edite os eventos da agência.</CardDescription>
          </div>
          {/* TODO: Add role check for displaying this button (admin/partner) */}
          <Button onClick={handleCreateEvent} className="ml-auto bg-primary hover:bg-primary/90 text-primary-foreground">
            <PlusCircle className="mr-2 h-5 w-5" />
            Novo Evento
          </Button>
        </CardHeader>
        <CardContent>
          {mockEvents.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum evento encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Evento</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Contratante</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Conta Recebeu</TableHead>
                    <TableHead>Status Pag.</TableHead>
                    <TableHead>DJ</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="font-medium">{format(event.data_evento, 'dd/MM/yyyy')}</div>
                        <div className="text-xs text-muted-foreground">{event.dia_da_semana}</div>
                        <div className="text-xs text-muted-foreground">{format(event.data_evento, 'HH:mm')}</div>
                      </TableCell>
                      <TableCell className="font-medium">{event.nome_evento}</TableCell>
                      <TableCell>{event.local}</TableCell>
                      <TableCell>{event.contratante_nome}</TableCell>
                      <TableCell>
                        {event.valor_total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                       <TableCell className="capitalize">
                        {event.conta_que_recebeu === 'agencia' ? 'Agência' : 'DJ'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(event.status_pagamento)} className="capitalize">
                          {getStatusText(event.status_pagamento)}
                        </Badge>
                      </TableCell>
                      <TableCell>{event.dj_nome}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button variant="outline" size="icon" aria-label="Visualizar Evento">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {/* TODO: Add role check for edit/delete */}
                        <Button variant="outline" size="icon" aria-label="Editar Evento">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="icon" aria-label="Excluir Evento">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {/* TODO: Add pagination if many events */}
      {/* TODO: Add filtering and sorting options */}
      {/* TODO: Implement modals/pages for Create/Edit/View Event */}
    </div>
  );
};

export default EventsPage;
