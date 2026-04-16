import React, { useState } from 'react';
import { askAI, AI_SYSTEM_PROMPTS } from '../utils/openrouter';

const QUICK_PROMPTS = [
  { label: 'Analyze current stock', icon: '◈', type: 'analyst' },
  { label: 'Detect anomalies', icon: '⚠', type: 'anomaly' },
  { label: 'Suggest optimizations', icon: '↑', type: 'recommendation' },
];

export default function AIAnalyst({ metrics, bases, equipTypes, currentFilters }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Ready for asset analysis. Ask me anything about your inventory, movements, or optimization strategies.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const buildContext = () => {
    if (!metrics) return 'No metrics available yet.';
    return `
CURRENT ASSET METRICS:
- Opening Balance: ${metrics.opening_balance}
- Closing Balance: ${metrics.closing_balance}
- Net Movement: ${metrics.net_movement}
- Purchases: ${metrics.purchases}
- Transfers In: ${metrics.transfer_in}
- Transfers Out: ${metrics.transfer_out}
- Assigned: ${metrics.assigned}
- Expended: ${metrics.expended}
Active Bases: ${bases.map(b => b.name).join(', ')}
Equipment Categories: ${[...new Set(equipTypes.map(e => e.category))].join(', ')}
${currentFilters?.base_id ? `Filtered to base: ${bases.find(b => b.id === currentFilters.base_id)?.name}` : 'Viewing all bases'}
    `.trim();
  };

  const sendMessage = async (text, promptType = 'analyst') => {
    if (!text.trim()) return;
    const userMsg = text.trim();
    setInput('');
    setError('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const contextData = buildContext();
      const fullPrompt = `${AI_SYSTEM_PROMPTS[promptType]}\n\nCurrent system context:\n${contextData}`;
      const reply = await askAI(fullPrompt, userMsg);
      setMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      setError(err.message);
      setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${err.message}`, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuick = (qp) => {
    sendMessage(qp.label, qp.type);
  };

  return (
    <div style={{ background: '#0d1225', border: '1px solid #1e3a6e', borderRadius: 10, overflow: 'hidden', fontFamily: "'Courier New', monospace" }}>
      <div style={{ padding: '14px 18px', borderBottom: '1px solid #1a2338', display: 'flex', alignItems: 'center', gap: 10, background: '#060d1f' }}>
        <span style={{ fontSize: 14, color: '#3b82f6' }}>◈</span>
        <div>
          <span style={{ color: '#93c5fd', fontSize: 13, letterSpacing: 2 }}>AI ANALYST</span>
          <span style={{ color: '#1e3a6e', fontSize: 11, marginLeft: 10 }}>gemini-2.5-pro</span>
        </div>
        <span style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}></span>
      </div>

      {/* Quick prompts */}
      <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderBottom: '1px solid #1a2338' }}>
        {QUICK_PROMPTS.map(qp => (
          <button key={qp.label} onClick={() => handleQuick(qp)} disabled={loading}
            style={{ background: '#060d1f', border: '1px solid #1a2338', borderRadius: 6, padding: '6px 12px', color: '#4a7bb5', fontSize: 11, cursor: loading ? 'not-allowed' : 'pointer', letterSpacing: 1, whiteSpace: 'nowrap' }}>
            {qp.icon} {qp.label}
          </button>
        ))}
      </div>

      {/* Chat messages */}
      <div style={{ height: 220, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '85%', padding: '10px 14px', borderRadius: 8, fontSize: 12, lineHeight: 1.6,
              background: msg.role === 'user' ? '#0d1f40' : msg.isError ? '#2d1515' : '#060a14',
              border: `1px solid ${msg.role === 'user' ? '#1e3a6e' : msg.isError ? '#7f1d1d' : '#1a2338'}`,
              color: msg.isError ? '#fca5a5' : '#c8d8f0',
              whiteSpace: 'pre-wrap',
            }}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 4, padding: '8px 14px', alignItems: 'center' }}>
            <span style={{ color: '#4a5568', fontSize: 12 }}>Analyzing</span>
            <span style={{ color: '#3b82f6', fontSize: 18, animation: 'pulse 1s infinite' }}>...</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #1a2338', display: 'flex', gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !loading && sendMessage(input)}
          placeholder="Ask about assets, anomalies, recommendations..."
          disabled={loading}
          style={{ flex: 1, background: '#060a14', border: '1px solid #1a2338', borderRadius: 6, padding: '9px 12px', color: '#e2e8f0', fontSize: 12, outline: 'none', fontFamily: 'inherit' }}
        />
        <button onClick={() => sendMessage(input)} disabled={loading || !input.trim()}
          style={{ background: loading || !input.trim() ? '#0d1225' : '#1d3a7a', border: '1px solid #1e3a6e', borderRadius: 6, padding: '9px 16px', color: '#60a5fa', fontSize: 12, cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', letterSpacing: 1 }}>
          →
        </button>
      </div>
    </div>
  );
}
