
'use client';

import type { Event } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, badgeVariants } from '@/components/ui/badge';
import { format } from 'date-fns';
import type { VariantProps } from 'class-variance-authority';
import { Timestamp } from 'firebase/firestore';
import { FileText, Link as LinkIcon } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

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

interface EventViewProps {
  event: Event | null;
}

export default function EventView({ event }: EventViewProps) {
  if (!event) {
    return <p className="text-muted-foreground">Nenhum evento selecionado para visualização.</p>;
  }

  const eventDate = event.data_evento instanceof Timestamp ? event.data_evento.toDate() : (typeof event.data_evento === 'string' ? new Date(event.data_evento) : event.data_evento);
  const createdAtDate = event.created_at instanceof Timestamp ? event.created_at.toDate() : (typeof event.created_at === 'string' ? new Date(event.created_at) : event.created_at);
  const updatedAtDate = event.updated_at ? (event.updated_at instanceof Timestamp ? event.updated_at.toDate() : (typeof event.updated_at === 'string' ? new Date(event.updated_at) : event.updated_at)) : null;


  return (
    <Card className="shadow-none border-0">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">{event.nome_evento}</CardTitle>
        <CardDescription>
          {format(eventDate, 'dd/MM/yyyy HH:mm')} ({event.dia_da_semana}) - {event.local}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold text-sm mb-1">Contratante:</h4>
          <p className="text-muted-foreground">{event.contratante_nome}</p>
          {event.contratante_contato && <p className="text-xs text-muted-foreground">{event.contratante_contato}</p>}
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-1">DJ:</h4>
          <p className="text-muted-foreground">{event.dj_nome} (ID: {event.dj_id})</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-semibold text-sm mb-1">Valor Total:</h4>
            <p className="text-muted-foreground">
              {Number(event.valor_total).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1">Valor Sinal:</h4>
            <p className="text-muted-foreground">
              {Number(event.valor_sinal).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
           <div>
            <h4 className="font-semibold text-sm mb-1">Custos do DJ:</h4>
            <p className="text-muted-foreground">
              {Number(event.dj_costs || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-sm mb-1">Conta Recebeu Sinal:</h4>
            <p className="text-muted-foreground capitalize">
              {event.conta_que_recebeu === 'agencia' ? 'Agência' : 'DJ'}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-sm mb-1">Status Pagamento:</h4>
            <Badge variant={getStatusVariant(event.status_pagamento)} className="capitalize text-xs">
              {getStatusText(event.status_pagamento)}
            </Badge>
          </div>
        </div>
        
        <Separator />

        <div>
          <h4 className="font-semibold text-sm mb-2">Comprovantes de Pagamento do DJ:</h4>
          {event.payment_proofs && event.payment_proofs.length > 0 ? (
            <ul className="space-y-2">
              {event.payment_proofs.map((proof, index) => (
                <li key={proof.id || index} className="flex items-center space-x-2 p-1.5 bg-secondary/30 rounded-md">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <a 
                    href={proof.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-xs text-primary hover:underline truncate"
                    title={proof.name}
                  >
                    {proof.name}
                  </a>
                  <span className="text-xs text-muted-foreground ml-auto">
                    ({format(proof.uploadedAt instanceof Timestamp ? proof.uploadedAt.toDate() : new Date(proof.uploadedAt), 'dd/MM/yy')})
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhum comprovante de pagamento enviado pelo DJ.</p>
          )}
        </div>

        {/* TODO: Display general event files (event.files) similarly if needed */}
        
        <Separator />

        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
            {createdAtDate && (
                <div>
                    <h4 className="font-semibold text-sm mb-1">Criado em:</h4>
                    <p>{format(createdAtDate, 'dd/MM/yyyy HH:mm')}</p>
                </div>
            )}
            {updatedAtDate && (
                <div>
                    <h4 className="font-semibold text-sm mb-1">Última Atualização:</h4>
                    <p>{format(updatedAtDate, 'dd/MM/yyyy HH:mm')}</p>
                </div>
            )}
        </div>
      </CardContent>
    </Card>
  );
}
