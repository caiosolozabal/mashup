
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

// Mock data -
// TODO: Replace with actual data fetching from Firestore
const mockEvents: Event[] = [
  {
    id: '1',
    date: new Date('2024-08-15T19:00:00'),
    name: 'Summer Fest',
    venue: 'Beach Club',
    client: 'John Doe Productions',
    totalValue: 5000,
    downPayment: 2000,
    paymentStatus: 'partial',
    accountReceived: 'Agency Account',
    assignedDJs: ['DJ Alpha', 'DJ Beta'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    date: new Date('2024-09-01T22:00:00'),
    name: 'Tech Night',
    venue: 'Warehouse X',
    client: 'Underground Events Co.',
    totalValue: 3000,
    downPayment: 3000,
    paymentStatus: 'paid',
    accountReceived: 'DJ Gamma Account',
    assignedDJs: ['DJ Gamma'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    date: new Date('2024-09-10T14:00:00'),
    name: 'Corporate Mixer',
    venue: 'Grand Hotel Ballroom',
    client: 'Innovate Corp',
    totalValue: 2500,
    downPayment: 0,
    paymentStatus: 'pending',
    accountReceived: 'Agency Account',
    assignedDJs: ['DJ Epsilon'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '4',
    date: new Date('2024-09-20T23:00:00'),
    name: 'Birthday Bash',
    venue: 'Private Residence',
    client: 'Jane Smith',
    totalValue: 1500,
    downPayment: 500,
    paymentStatus: 'overdue',
    accountReceived: 'Agency Account',
    assignedDJs: ['DJ Zeta'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const getStatusVariant = (status: Event['paymentStatus']): VariantProps<typeof badgeVariants>['variant'] => {
  switch (status) {
    case 'paid': return 'default'; // Default is primary, often used for success
    case 'partial': return 'secondary';
    case 'pending': return 'outline';
    case 'overdue': return 'destructive';
    default: return 'outline';
  }
};

const EventsPage: NextPage = () => {
  // TODO: Implement create event functionality (e.g., open a modal or navigate to a new page)
  const handleCreateEvent = () => {
    console.log('Create new event clicked');
    // For now, just a log. Later, this will open a form/modal.
  };

  return (
    <div className="space-y-8">
      <Card className="shadow-lg">
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="font-headline text-2xl">Gerenciar Eventos</CardTitle>
            <CardDescription>Visualize, crie e edite os eventos da agência.</CardDescription>
          </div>
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
                    <TableHead>Cliente</TableHead>
                    <TableHead>DJs</TableHead>
                    <TableHead>Status Pag.</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockEvents.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell>
                        <div className="font-medium">{format(event.date, 'dd/MM/yyyy')}</div>
                        <div className="text-xs text-muted-foreground">{format(event.date, 'HH:mm')}</div>
                      </TableCell>
                      <TableCell className="font-medium">{event.name}</TableCell>
                      <TableCell>{event.venue}</TableCell>
                      <TableCell>{event.client}</TableCell>
                      <TableCell>{event.assignedDJs.join(', ')}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(event.paymentStatus)} className="capitalize">
                          {event.paymentStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="icon" aria-label="Visualizar Evento">
                          <Eye className="h-4 w-4" />
                        </Button>
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
    </div>
  );
};

export default EventsPage;

