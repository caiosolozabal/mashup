
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import type { Event } from '@/lib/types';
import { Timestamp } from 'firebase/firestore';

const getDayOfWeek = (date: Date | undefined): string => {
  if (!date) return '';
  const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  return days[date.getDay()];
};

const eventFormSchema = z.object({
  nome_evento: z.string().min(3, { message: 'Nome do evento deve ter pelo menos 3 caracteres.' }),
  local: z.string().min(3, { message: 'Local deve ter pelo menos 3 caracteres.' }),
  data_evento: z.date({ required_error: 'Data do evento é obrigatória.' }),
  contratante_nome: z.string().min(3, { message: 'Nome do contratante deve ter pelo menos 3 caracteres.' }),
  contratante_contato: z.string().optional().nullable(),
  valor_total: z.coerce.number().positive({ message: 'Valor total deve ser positivo.' }),
  valor_sinal: z.coerce.number().min(0, { message: 'Valor do sinal não pode ser negativo.' }),
  conta_que_recebeu: z.enum(['agencia', 'dj'], { required_error: 'Selecione quem recebeu o sinal.' }),
  status_pagamento: z.enum(['pendente', 'parcial', 'pago', 'vencido', 'cancelado'], { required_error: 'Status do pagamento é obrigatório.' }),
  dj_nome: z.string().min(2, { message: 'Nome do DJ é obrigatório.' }),
  dj_id: z.string().min(1, { message: 'ID do DJ é obrigatório (pode ser um placeholder por enquanto).' }),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  event?: Event | null;
  onSubmit: (values: EventFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export default function EventForm({ event, onSubmit, onCancel, isLoading }: EventFormProps) {
  const defaultValues = event
    ? {
        ...event,
        data_evento: event.data_evento instanceof Timestamp ? event.data_evento.toDate() : (typeof event.data_evento === 'string' ? parseISO(event.data_evento) : event.data_evento),
        valor_total: Number(event.valor_total),
        valor_sinal: Number(event.valor_sinal),
      }
    : {
        valor_total: 0,
        valor_sinal: 0,
        status_pagamento: 'pendente',
        conta_que_recebeu: 'agencia',
      };

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues: defaultValues as any, // Zod schema has stricter date, coercion handles it
  });

  const handleSubmit = async (values: EventFormValues) => {
    await onSubmit(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="nome_evento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Evento</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Festa de Aniversário" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="local"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Local</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Salão XYZ" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="data_evento"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Data e Hora do Evento</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={'outline'}
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? (
                        format(field.value, 'dd/MM/yyyy HH:mm')
                      ) : (
                        <span>Escolha uma data e hora</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={(date) => {
                      if (date) {
                        const currentHour = field.value?.getHours() ?? 19; // Default to 7 PM or current hour
                        const currentMinutes = field.value?.getMinutes() ?? 0;
                        date.setHours(currentHour, currentMinutes);
                      }
                      field.onChange(date);
                    }}
                    disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1 )) } // Disable past dates
                    initialFocus
                  />
                  <div className="p-2 border-t border-border">
                    <Input 
                      type="time"
                      defaultValue={field.value ? format(field.value, 'HH:mm') : "19:00"}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(':').map(Number);
                        const newDate = field.value ? new Date(field.value) : new Date();
                        newDate.setHours(hours, minutes);
                        field.onChange(newDate);
                      }}
                    />
                  </div>
                </PopoverContent>
              </Popover>
              {field.value && <FormDescription>Dia da semana: {getDayOfWeek(field.value)}</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contratante_nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Contratante</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: João Silva" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="contratante_contato"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contato do Contratante (Opcional)</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: (11) 99999-9999 ou email@example.com" {...field} value={field.value ?? ''}/>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="valor_total"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor Total (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="Ex: 1500.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="valor_sinal"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Valor do Sinal (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="Ex: 500.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="conta_que_recebeu"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Conta que Recebeu o Sinal</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="agencia">Agência</SelectItem>
                    <SelectItem value="dj">DJ</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status_pagamento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status do Pagamento</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="parcial">Parcial</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="vencido">Vencido</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <FormField
            control={form.control}
            name="dj_nome"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do DJ</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: DJ Beatmaster" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="dj_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID do DJ</FormLabel>
                <FormControl>
                  <Input placeholder="ID único do DJ" {...field} />
                </FormControl>
                <FormDescription>Este ID será usado para referenciar o DJ no sistema.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {event ? 'Salvar Alterações' : 'Criar Evento'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
