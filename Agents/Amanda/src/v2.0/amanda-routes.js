// ============================================
// AMANDA ROUTES V3
// ============================================

const { processCustomerMessage, getConversationState, resetConversation } = require('./conversation-handler');
const BoxPricingCalculator = require('./calculator');
const axios = require('axios');

const calculator = new BoxPricingCalculator();
const ATLAS_URL = process.env.ATLAS_URL || 'http://localhost:3002';

async function routes(fastify, options) {
    // Health check
    fastify.get('/health', async (request, reply) => {
        return { 
            status: 'ok', 
            agent: 'Amanda', 
            version: '3.0',
            timestamp: new Date().toISOString()
        };
    });

    // ============================================
    // ENDPOINT PRINCIPAL DO WPPCONNECT
    // ============================================
    fastify.post('/api/amanda', async (request, reply) => {
        try {
            const { message, from, isGroupMsg, sender } = request.body;
            
            // Ignorar mensagens de grupo
            if (isGroupMsg) {
                return { success: true, ignored: true, reason: 'group_message' };
            }
            
            // Extrair número de telefone
            const phoneNumber = from || sender?.id || 'unknown';
            
            console.log(`[Amanda] Mensagem recebida de ${phoneNumber}: ${message}`);
            
            // Processar mensagem com o conversation handler
            const response = await processCustomerMessage(phoneNumber, message);
            
            // Verificar se o pedido está completo
            const state = getConversationState(phoneNumber);
            
            if (state && state.status === 'complete' && state.orderData) {
                console.log('[Amanda] Pedido completo detectado, enviando para Atlas...');
                
                // Calcular preço usando a calculadora
                try {
                    const pricing = calculatePrice(state.orderData, phoneNumber);
                    
                    // Enviar para Atlas
                    const atlasPayload = {
                        phoneNumber,
                        orderData: state.orderData,
                        pricing: pricing,
                        conversationId: state.conversationId,
                        timestamp: new Date().toISOString()
                    };
                    
                    const atlasResponse = await axios.post(`${ATLAS_URL}/api/v1/orders/validate`, atlasPayload);
                    console.log('[Amanda] Resposta do Atlas:', atlasResponse.data);
                    
                    // Resetar conversa após envio bem-sucedido
                    if (atlasResponse.data.success) {
                        resetConversation(phoneNumber);
                        response.additionalMessage = '\n\n✅ Seu pedido foi enviado para processamento!';
                    }
                } catch (error) {
                    console.error('[Amanda] Erro ao enviar para Atlas:', error.message);
                    response.additionalMessage = '\n\n❌ Erro ao processar seu pedido. Vamos tentar novamente.';
                }
            }
            
            // Retornar resposta formatada para o WPPConnect
            return {
                success: true,
                response: response.message + (response.additionalMessage || ''),
                to: phoneNumber,
                state: state?.status || 'active'
            };
            
        } catch (error) {
            console.error('[Amanda] Erro ao processar mensagem:', error);
            return {
                success: false,
                error: error.message,
                response: 'Desculpe, ocorreu um erro ao processar sua mensagem. Vamos tentar novamente.'
            };
        }
    });

    // Webhook alternativo (mantido para compatibilidade)
    fastify.post('/webhook', async (request, reply) => {
        try {
            const { message, from, profileName } = request.body;
            
            console.log(`[Amanda] Webhook recebido de ${from}: ${message}`);
            
            const response = await processCustomerMessage(from, message, profileName);
            
            const state = getConversationState(from);
            
            if (state && state.status === 'complete' && state.orderData) {
                console.log('[Amanda] Pedido completo detectado, enviando para Atlas...');
                
                try {
                    const pricing = calculatePrice(state.orderData, from);
                    
                    const atlasPayload = {
                        phoneNumber: from,
                        customerName: profileName,
                        orderData: state.orderData,
                        pricing: pricing,
                        conversationId: state.conversationId,
                        timestamp: new Date().toISOString()
                    };
                    
                    const atlasResponse = await axios.post(`${ATLAS_URL}/api/v1/orders/validate`, atlasPayload);
                    console.log('[Amanda] Resposta do Atlas:', atlasResponse.data);
                    
                    if (atlasResponse.data.success) {
                        resetConversation(from);
                        response.additionalMessage = '\n\n✅ Pedido enviado para processamento!';
                    }
                } catch (error) {
                    console.error('[Amanda] Erro ao enviar para Atlas:', error.message);
                    response.additionalMessage = '\n\n❌ Erro ao processar pedido.';
                }
            }
            
            return {
                success: true,
                response: response,
                state: state
            };
            
        } catch (error) {
            console.error('[Amanda] Erro no webhook:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    // Receber correções do Atlas
    fastify.post('/corrections', async (request, reply) => {
        try {
            const { phoneNumber, corrections, conversationId } = request.body;
            
            console.log(`[Amanda] Correções recebidas do Atlas para ${phoneNumber}:`, corrections);
            
            let correctionMessage = "📋 Precisamos ajustar algumas informações:\n\n";
            corrections.forEach(correction => {
                correctionMessage += `❗ ${correction}\n`;
            });
            correctionMessage += "\nPor favor, me informe os dados corretos.";
            
            // Resetar status da conversa para permitir correções
            const state = getConversationState(phoneNumber);
            if (state) {
                state.status = 'awaiting_corrections';
                state.corrections = corrections;
            }
            
            return {
                success: true,
                message: 'Correções recebidas',
                responseToSend: correctionMessage
            };
            
        } catch (error) {
            console.error('[Amanda] Erro ao processar correções:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    // Receber proposta final do Atlas/BlingBot
    fastify.post('/send-proposal', async (request, reply) => {
        try {
            const { phoneNumber, proposal, blingOrderId } = request.body;
            
            console.log(`[Amanda] Proposta recebida para ${phoneNumber}:`, proposal);
            
            let proposalMessage = `📦 *PROPOSTA COMERCIAL*\n`;
            proposalMessage += `━━━━━━━━━━━━━━━━━━━\n\n`;
            proposalMessage += `🔢 *Nº Orçamento:* ${proposal.numeroOrcamento || blingOrderId}\n`;
            proposalMessage += `📏 *Produto:* ${proposal.items?.[0]?.descricao || 'Caixa de papelão'}\n`;
            proposalMessage += `📊 *Quantidade:* ${proposal.items?.[0]?.qtde || proposal.quantidade} unidades\n`;
            proposalMessage += `💰 *Valor Unitário:* R$ ${proposal.valorUnitario || '0.00'}\n`;
            proposalMessage += `💵 *Valor Total:* R$ ${proposal.valorTotal || '0.00'}\n\n`;
            proposalMessage += `📅 *Prazo de Produção:* ${proposal.prazoProducao || '15 dias úteis'}\n`;
            proposalMessage += `✅ *Validade:* ${proposal.validadeOrcamento || '30 dias'}\n`;
            proposalMessage += `💳 *Condições:* ${proposal.condicoesPagamento || '50% entrada + 50% entrega'}\n\n`;
            proposalMessage += `Para confirmar o pedido, digite *CONFIRMAR*\n`;
            proposalMessage += `Para cancelar, digite *CANCELAR*`;
            
            // Salvar proposta no estado da conversa
            const state = getConversationState(phoneNumber);
            if (state) {
                state.proposal = proposal;
                state.blingOrderId = blingOrderId;
                state.status = 'awaiting_confirmation';
            }
            
            return {
                success: true,
                message: 'Proposta preparada para envio',
                proposalMessage: proposalMessage
            };
            
        } catch (error) {
            console.error('[Amanda] Erro ao processar proposta:', error);
            return {
                success: false,
                error: error.message
            };
        }
    });

    // Status da conversa
    fastify.get('/conversation/:phoneNumber', async (request, reply) => {
        try {
            const { phoneNumber } = request.params;
            const state = getConversationState(phoneNumber);
            
            return {
                success: true,
                state: state || { message: 'Nenhuma conversa ativa' }
            };
            
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    });
}

// Função para calcular preço
function calculatePrice(orderData, phoneNumber) {
    try {
        if (orderData.tipo === 'Maleta') {
            return calculator.calculateMaletaPrice(
                orderData.comprimento,
                orderData.largura,
                orderData.altura,
                orderData.quantidade,
                orderData.gramatura,
                orderData.comImpressao,
                phoneNumber
            );
        } else {
            return calculator.calculateAutomontavelPrice(
                orderData.comprimento,
                orderData.largura,
                orderData.altura,
                orderData.quantidade,
                orderData.gramatura,
                orderData.comImpressao,
                phoneNumber
            );
        }
    } catch (error) {
        console.error('[Amanda] Erro ao calcular preço:', error);
        return {
            sucesso: false,
            mensagem: 'Erro ao calcular preço',
            precoUnitario: 0,
            precoTotal: 0
        };
    }
}

module.exports = { routes };
