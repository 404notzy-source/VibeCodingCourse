import { useState, useRef, useEffect } from 'react'
import { MessageSquare, Pencil, Trash2, Check, X } from 'lucide-react'
import type { Session } from '../../types'
import { useChatStore } from '../../stores/chatStore'

interface Props {
  session: Session
  isActive: boolean
}

export default function SessionItem({ session, isActive }: Props) {
  const setCurrentSession = useChatStore((s) => s.setCurrentSession)
  const deleteSession = useChatStore((s) => s.deleteSession)
  const renameSession = useChatStore((s) => s.renameSession)

  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(session.title)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleRename = () => {
    if (editTitle.trim()) {
      renameSession(session.id, editTitle.trim())
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRename()
    if (e.key === 'Escape') {
      setEditTitle(session.title)
      setIsEditing(false)
    }
  }

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
          : 'hover:bg-slate-50 text-slate-600 border border-transparent'
      }`}
      onClick={() => !isEditing && setCurrentSession(session.id)}
    >
      <MessageSquare
        size={14}
        className={`shrink-0 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`}
      />

      {isEditing ? (
        <div className="flex items-center gap-1 flex-1 min-w-0">
          <input
            ref={inputRef}
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleRename}
            className="flex-1 bg-white text-sm text-slate-700 px-1.5 py-0.5 rounded border border-slate-300 outline-none focus:border-indigo-400 min-w-0"
          />
          <button onClick={handleRename} className="text-green-500 hover:text-green-600 cursor-pointer">
            <Check size={14} />
          </button>
          <button
            onClick={() => {
              setEditTitle(session.title)
              setIsEditing(false)
            }}
            className="text-slate-400 hover:text-slate-500 cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>
      ) : (
        <>
          <span className={`flex-1 text-sm truncate ${isActive ? 'font-medium' : ''}`}>
            {session.title}
          </span>
          <div className="hidden group-hover:flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setIsEditing(true)
              }}
              className="p-0.5 text-slate-400 hover:text-indigo-500 cursor-pointer"
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                deleteSession(session.id)
              }}
              className="p-0.5 text-slate-400 hover:text-red-500 cursor-pointer"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </>
      )}
    </div>
  )
}
