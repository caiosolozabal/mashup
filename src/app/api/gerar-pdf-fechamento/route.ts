import { NextRequest, NextResponse } from 'next/server';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebaseConfig';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

interface Fechamento {
  id?: string;
  dj_id: string;
  dj_nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  valor_total: number;
  custos_total: number;
  percentual_dj: number;
  valor_liquido: number;
  status: "pendente" | "pago";
  observacoes?: string;
  comprovante_url?: string;
  created_at: any;
  created_by: string;
  eventos: string[]; // IDs dos eventos incluídos no fechamento
}

interface Evento {
  id: string;
  nome_evento: string;
  data: string;
  local: string;
  horario?: string;
  valor_total: number;
  custos?: number;
  percentual_dj?: number;
  dj_id: string;
  dj_nome?: string;
  status_pgto: string;
  status_evento?: string;
  status_aprovacao?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { fechamentoId } = await request.json();
    
    if (!fechamentoId) {
      return NextResponse.json({ error: 'ID do fechamento não fornecido' }, { status: 400 });
    }
    
    // Buscar dados do fechamento
    const fechamentoRef = doc(db, "fechamentos", fechamentoId);
    const fechamentoSnap = await getDoc(fechamentoRef);
    
    if (!fechamentoSnap.exists()) {
      return NextResponse.json({ error: 'Fechamento não encontrado' }, { status: 404 });
    }
    
    const fechamento = fechamentoSnap.data() as Fechamento;
    fechamento.id = fechamentoId;
    
    // Buscar eventos incluídos no fechamento
    const eventos: Evento[] = [];
    
    for (const eventoId of fechamento.eventos) {
      const eventoRef = doc(db, "eventos", eventoId);
      const eventoSnap = await getDoc(eventoRef);
      
      if (eventoSnap.exists()) {
        const evento = eventoSnap.data() as Evento;
        evento.id = eventoId;
        eventos.push(evento);
      }
    }
    
    // Ordenar eventos por data
    eventos.sort((a, b) => a.data.localeCompare(b.data));
    
    // Buscar dados da agência (configurações)
    const configRef = doc(db, "configuracoes", "agencia");
    const configSnap = await getDoc(configRef);
    
    const configAgencia = configSnap.exists() ? configSnap.data() : {
      nome: "Agência de DJs",
      endereco: "Rua Exemplo, 123 - São Paulo/SP",
      telefone: "(11) 99999-9999",
      email: "contato@agenciadjs.com",
      site: "www.agenciadjs.com",
      cnpj: "00.000.000/0001-00"
    };
    
    // Gerar HTML para o PDF
    const htmlContent = generatePdfHtml(fechamento, eventos, configAgencia);
    
    // Criar arquivo HTML temporário
    const tempDir = os.tmpdir();
    const htmlFilePath = path.join(tempDir, `fechamento_${fechamentoId}.html`);
    const pdfFilePath = path.join(tempDir, `fechamento_${fechamentoId}.pdf`);
    
    fs.writeFileSync(htmlFilePath, htmlContent);
    
    // Converter HTML para PDF usando WeasyPrint
    await execPromise(`weasyprint ${htmlFilePath} ${pdfFilePath}`);
    
    // Ler o arquivo PDF gerado
    const pdfBuffer = fs.readFileSync(pdfFilePath);
    
    // Limpar arquivos temporários
    fs.unlinkSync(htmlFilePath);
    fs.unlinkSync(pdfFilePath);
    
    // Retornar o PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="fechamento_${fechamentoId}.pdf"`
      }
    });
    
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    return NextResponse.json({ error: 'Erro ao gerar PDF' }, { status: 500 });
  }
}

function formatarData(dataISO: string) {
  if (!dataISO) return "-";
  const [ano, mes, dia] = dataISO.split("-");
  return `${dia}/${mes}/${ano}`;
}

function formatarValor(valor?: number) {
  if (valor === undefined || valor === null) return "R$ 0,00";
  return `R$ ${valor.toFixed(2).replace('.', ',')}`;
}

function generatePdfHtml(fechamento: Fechamento, eventos: Evento[], configAgencia: any) {
  const dataEmissao = new Date().toLocaleDateString('pt-BR');
  
  return `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Fechamento Financeiro - ${fechamento.dj_nome}</title>
      <style>
        @page {
          size: A4;
          margin: 2cm;
        }
        body {
          font-family: "Noto Sans CJK SC", "WenQuanYi Zen Hei", sans-serif;
          line-height: 1.5;
          color: #333;
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #ddd;
        }
        .header h1 {
          color: #2563eb;
          margin-bottom: 5px;
        }
        .header p {
          color: #666;
          margin: 5px 0;
        }
        .info-section {
          margin-bottom: 30px;
        }
        .info-section h2 {
          color: #2563eb;
          border-bottom: 1px solid #ddd;
          padding-bottom: 5px;
          margin-bottom: 15px;
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }
        .info-item {
          margin-bottom: 10px;
        }
        .info-item .label {
          font-weight: bold;
          color: #666;
          font-size: 0.9em;
        }
        .info-item .value {
          font-size: 1.1em;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 8px 12px;
          text-align: left;
        }
        th {
          background-color: #f2f7ff;
          font-weight: bold;
          color: #2563eb;
        }
        tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        .summary {
          margin-top: 30px;
          background-color: #f2f7ff;
          padding: 15px;
          border-radius: 5px;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 20px;
        }
        .summary-item {
          text-align: center;
        }
        .summary-item .label {
          font-weight: bold;
          color: #666;
          font-size: 0.9em;
        }
        .summary-item .value {
          font-size: 1.3em;
          font-weight: bold;
          color: #2563eb;
        }
        .final-value {
          font-size: 1.5em;
          font-weight: bold;
          color: #16a34a;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          font-size: 0.9em;
          color: #666;
          border-top: 1px solid #ddd;
          padding-top: 20px;
        }
        .status {
          display: inline-block;
          padding: 5px 10px;
          border-radius: 15px;
          font-weight: bold;
          font-size: 0.9em;
        }
        .status-pendente {
          background-color: #fff7ed;
          color: #c2410c;
        }
        .status-pago {
          background-color: #f0fdf4;
          color: #16a34a;
        }
        .observacoes {
          margin-top: 30px;
          padding: 15px;
          background-color: #f9f9f9;
          border-radius: 5px;
          border-left: 4px solid #ddd;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${configAgencia.nome}</h1>
          <p>${configAgencia.endereco}</p>
          <p>${configAgencia.telefone} | ${configAgencia.email}</p>
          <p>CNPJ: ${configAgencia.cnpj}</p>
        </div>
        
        <div class="info-section">
          <h2>Fechamento Financeiro</h2>
          <div class="info-grid">
            <div>
              <div class="info-item">
                <div class="label">DJ:</div>
                <div class="value">${fechamento.dj_nome}</div>
              </div>
              <div class="info-item">
                <div class="label">Período:</div>
                <div class="value">${formatarData(fechamento.periodo_inicio)} a ${formatarData(fechamento.periodo_fim)}</div>
              </div>
              <div class="info-item">
                <div class="label">Data de Emissão:</div>
                <div class="value">${dataEmissao}</div>
              </div>
            </div>
            <div>
              <div class="info-item">
                <div class="label">Status:</div>
                <div class="value">
                  <span class="status ${fechamento.status === 'pago' ? 'status-pago' : 'status-pendente'}">
                    ${fechamento.status === 'pago' ? 'PAGO' : 'PENDENTE'}
                  </span>
                </div>
              </div>
              <div class="info-item">
                <div class="label">Número do Fechamento:</div>
                <div class="value">${fechamento.id}</div>
              </div>
            </div>
          </div>
        </div>
        
        <div class="info-section">
          <h2>Eventos Incluídos</h2>
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Evento</th>
                <th>Local</th>
                <th>Valor Total</th>
                <th>Custos</th>
              </tr>
            </thead>
            <tbody>
              ${eventos.map(evento => `
                <tr>
                  <td>${formatarData(evento.data)}</td>
                  <td>${evento.nome_evento}</td>
                  <td>${evento.local}</td>
                  <td>${formatarValor(evento.valor_total)}</td>
                  <td>${formatarValor(evento.custos)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        
        <div class="summary">
          <div class="summary-grid">
            <div class="summary-item">
              <div class="label">Valor Total Bruto</div>
              <div class="value">${formatarValor(fechamento.valor_total)}</div>
            </div>
            <div class="summary-item">
              <div class="label">Total de Custos</div>
              <div class="value">${formatarValor(fechamento.custos_total)}</div>
            </div>
            <div class="summary-item">
              <div class="label">Percentual do DJ</div>
              <div class="value">${fechamento.percentual_dj}%</div>
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 20px;">
            <div class="label" style="font-size: 1.1em;">Valor Líquido a Pagar ao DJ</div>
            <div class="final-value">${formatarValor(fechamento.valor_liquido)}</div>
          </div>
        </div>
        
        ${fechamento.observacoes ? `
          <div class="observacoes">
            <h3>Observações</h3>
            <p>${fechamento.observacoes}</p>
          </div>
        ` : ''}
        
        <div class="footer">
          <p>Este documento é um comprovante de fechamento financeiro entre ${configAgencia.nome} e o DJ ${fechamento.dj_nome}.</p>
          <p>Emitido em ${dataEmissao} | ${configAgencia.site}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
