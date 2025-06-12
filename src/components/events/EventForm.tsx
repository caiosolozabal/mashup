
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
import { CalendarIcon, Loader2, FileText, UploadCloud } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import type { Event, EventFile } from '@/lib/types';
import { Timestamp, doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { db, storage } from '@/lib/firebase'; 
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';


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
  dj_costs: z.coerce.number().min(0, { message: 'Custos do DJ não podem ser negativos.' }).default(0).optional(),
});

export type EventFormValues = z.infer<typeof eventFormSchema>;

interface EventFormProps {
  event?: Event | null;
  onSubmit: (values: EventFormValues) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  onSuccessfulProofUpload?: (updatedEvent: Event) => void;
}

export default function EventForm({ event, onSubmit, onCancel, isLoading, onSuccessfulProofUpload }: EventFormProps) {
  const { toast } = useToast();
  const [selectedProofFile, setSelectedProofFile] = useState<File | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  
  const defaultValuesForCreate: EventFormValues = {
    nome_evento: '',
    local: '',
    data_evento: undefined as any,
    contratante_nome: '',
    contratante_contato: '',
    valor_total: 0,
    valor_sinal: 0,
    conta_que_recebeu: 'agencia',
    status_pagamento: 'pendente',
    dj_nome: '',
    dj_id: '',
    dj_costs: 0,
  };

  const defaultValues = event
    ? {
        ...event,
        nome_evento: event.nome_evento || '',
        local: event.local || '',
        data_evento: event.data_evento instanceof Timestamp 
            ? event.data_evento.toDate() 
            : (typeof event.data_evento === 'string' ? parseISO(event.data_evento) : event.data_evento),
        contratante_nome: event.contratante_nome || '',
        contratante_contato: event.contratante_contato ?? '',
        valor_total: Number(event.valor_total),
        valor_sinal: Number(event.valor_sinal),
        conta_que_recebeu: event.conta_que_recebeu || 'agencia',
        status_pagamento: event.status_pagamento || 'pendente',
        dj_nome: event.dj_nome || '',
        dj_id: event.dj_id || '',
        dj_costs: event.dj_costs ? Number(event.dj_costs) : 0,
      }
    : defaultValuesForCreate;

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
  });

  const handleSubmit = async (values: EventFormValues) => {
    const submissionValues = {
      ...values,
      contratante_contato: values.contratante_contato === '' ? null : values.contratante_contato,
      dj_costs: values.dj_costs ? Number(values.dj_costs) : 0,
    };
    await onSubmit(submissionValues);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      console.log('File selected:', e.target.files[0].name);
      setSelectedProofFile(e.target.files[0]);
    } else {
      console.log('No file selected or selection cleared.');
      setSelectedProofFile(null);
    }
  };

  const handleProofUpload = async () => {
    console.log('handleProofUpload initiated.');
    if (!selectedProofFile) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Nenhum arquivo selecionado.' });
      console.error('handleProofUpload: No file selected.');
      return;
    }
    if (!event || !event.id) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Evento não definido ou não salvo. Salve o evento primeiro.' });
      console.error('handleProofUpload: Event not defined or has no ID.');
      return;
    }
    if (!storage || !db) {
      toast({ variant: 'destructive', title: 'Erro de Configuração', description: 'Firebase Storage ou Firestore não inicializado.' });
      console.error('handleProofUpload: Firebase Storage or Firestore not initialized.');
      return;
    }

    console.log(`handleProofUpload: Attempting to upload ${selectedProofFile.name} for event ${event.id}`);
    setIsUploadingProof(true);
    const proofId = uuidv4();
    const fileName = `${proofId}-${selectedProofFile.name}`;
    const filePath = `events/${event.id}/payment_proofs/${fileName}`;
    const fileSRef = storageRef(storage, filePath);

    console.log(`handleProofUpload: Storage path: ${filePath}`);

    try {
      const uploadTask = uploadBytesResumable(fileSRef, selectedProofFile);

      uploadTask.on('state_changed',
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
        },
        (error) => { // Error callback for uploadTask
          console.error("Firebase Storage Upload Error (uploadTask.on error callback):", error.code, error.message, error);
          toast({ variant: 'destructive', title: 'Falha no Upload (Storage)', description: `Erro: ${error.message} (Code: ${error.code})` });
          setIsUploadingProof(false);
        },
        async () => { // Completion callback for uploadTask
          console.log('Firebase Storage Upload: Upload completed successfully. Getting download URL...');
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            console.log('Firebase Storage Upload: Download URL obtained:', downloadURL);
            
            const newProofData: EventFile = {
              id: proofId,
              name: selectedProofFile.name,
              url: downloadURL,
              type: 'dj_receipt', 
              uploadedAt: new Date(), 
            };

            const eventRef = doc(db, 'events', event.id!); // event.id is confirmed not null by checks above
            console.log('Firestore Update: Attempting to update event document with new proof data...');
            await updateDoc(eventRef, {
              payment_proofs: arrayUnion(newProofData),
              updated_at: serverTimestamp(),
            });
            console.log('Firestore Update: Event document updated successfully.');
            
            toast({ title: 'Comprovante Enviado!', description: `${selectedProofFile.name} foi enviado com sucesso.` });
            setSelectedProofFile(null); 
            
            if (onSuccessfulProofUpload) {
              console.log('Calling onSuccessfulProofUpload callback.');
              const updatedEventWithNewProof: Event = {
                ...event, 
                payment_proofs: [...(event.payment_proofs || []), newProofData],
                updated_at: new Date() 
              };
              onSuccessfulProofUpload(updatedEventWithNewProof);
            }
            
           const fileInput = document.getElementById('payment-proof-upload') as HTMLInputElement;
           if (fileInput) fileInput.value = '';

          } catch (firestoreError: any) {
            console.error("Firestore Update Error (after successful upload):", firestoreError.code, firestoreError.message, firestoreError);
            toast({ variant: 'destructive', title: 'Erro ao Salvar Comprovante no Evento', description: `Erro: ${firestoreError.message} (Code: ${firestoreError.code})` });
          } finally {
            setIsUploadingProof(false);
          }
        }
      );
    } catch (initialError: any) { // Catches errors from storageRef or initial call to uploadBytesResumable
      console.error("Error initiating proof upload (outer try-catch):", initialError.code, initialError.message, initialError);
      toast({ variant: 'destructive', title: 'Erro Crítico no Upload', description: `Erro: ${initialError.message} (Code: ${initialError.code})` });
      setIsUploadingProof(false);
    }
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
                        const currentHour = field.value?.getHours() ?? 19;
                        const currentMinutes = field.value?.getMinutes() ?? 0;
                        date.setHours(currentHour, currentMinutes);
                      }
                      field.onChange(date);
                    }}
                    disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1 )) }
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
                  <Input placeholder="Ex: (11) 99999-9999 ou email@example.com" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
          <FormField
            control={form.control}
            name="dj_costs"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custos do DJ (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="Ex: 100.00" {...field} />
                </FormControl>
                <FormDescription>Custos como transporte, etc.</FormDescription>
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

        <Separator />

        <div>
          <h3 className="text-lg font-medium mb-2">Comprovantes de Pagamento do DJ</h3>
          {event?.payment_proofs && event.payment_proofs.length > 0 ? (
            <ul className="space-y-2 mb-3">
              {event.payment_proofs.map((proof, index) => (
                <li key={proof.id || index} className="flex items-center justify-between p-2 border rounded-md">
                  <div className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <a href={proof.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                      {proof.name}
                    </a>
                    <span className="text-xs text-muted-foreground">({format(proof.uploadedAt instanceof Timestamp ? proof.uploadedAt.toDate() : new Date(proof.uploadedAt), 'dd/MM/yy')})</span>
                  </div>
                  {/* TODO: Add delete button for proofs - requires backend logic */}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground mb-3">Nenhum comprovante enviado ainda.</p>
          )}
          <FormItem>
            <FormLabel htmlFor="payment-proof-upload">Enviar Novo Comprovante</FormLabel>
            <div className="flex items-center gap-2">
              <FormControl>
                <Input 
                  id="payment-proof-upload" 
                  type="file" 
                  className="flex-grow" 
                  onChange={handleFileSelect}
                  accept="image/*,application/pdf"
                  disabled={isUploadingProof || !event?.id}
                /> 
              </FormControl>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleProofUpload} 
                disabled={isUploadingProof || !selectedProofFile || !event?.id}
              >
                {isUploadingProof ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                Upload
              </Button>
            </div>
            <FormDescription>Selecione o arquivo do comprovante (PDF, JPG, PNG). Máx 5MB.</FormDescription>
             { !event?.id && <FormDescription className="text-destructive">Salve o evento primeiro para poder enviar comprovantes.</FormDescription>}
          </FormItem>
        </div>


        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading || isUploadingProof}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading || isUploadingProof} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {(isLoading || isUploadingProof) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {event ? 'Salvar Alterações' : 'Criar Evento'}
          </Button>
        </div>
      </form>
    </Form>
  );
}

