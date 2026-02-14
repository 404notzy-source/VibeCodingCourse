import { useState } from 'react'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { Copy, Check } from 'lucide-react'

interface Props {
  sql: string
}

export default function SqlBlock({ sql }: Props) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="my-2 rounded-lg overflow-hidden border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-100 text-xs text-slate-500">
        <span className="font-medium">SQL</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-indigo-500 transition-colors cursor-pointer"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <SyntaxHighlighter
        language="sql"
        style={oneLight}
        customStyle={{
          margin: 0,
          padding: '12px',
          fontSize: '13px',
          background: '#fafbfc',
        }}
      >
        {sql}
      </SyntaxHighlighter>
    </div>
  )
}
