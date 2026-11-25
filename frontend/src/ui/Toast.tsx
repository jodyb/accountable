// Short messages after an action, such as "Deal moved to Won." (Radix Toast underneath).
import * as RadixToast from '@radix-ui/react-toast'
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

type Message = { id: number; text: string; bad: boolean }
type Notify = (text: string, options?: { bad?: boolean }) => void

const ToastContext = createContext<Notify>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([])
  const notify = useCallback<Notify>((text, options) => {
    setMessages((m) => [...m, { id: Date.now() + Math.random(), text, bad: !!options?.bad }])
  }, [])
  const remove = (id: number) => setMessages((m) => m.filter((x) => x.id !== id))

  return (
    <ToastContext.Provider value={notify}>
      <RadixToast.Provider duration={5000}>
        {children}
        {messages.map((m) => (
          <RadixToast.Root
            key={m.id}
            className={`toast${m.bad ? ' bad' : ''}`}
            type={m.bad ? 'foreground' : 'background'}
            onOpenChange={(open) => !open && remove(m.id)}
          >
            <RadixToast.Description>{m.text}</RadixToast.Description>
          </RadixToast.Root>
        ))}
        <RadixToast.Viewport className="toasts" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  )
}

export function useToast(): Notify {
  return useContext(ToastContext)
}
