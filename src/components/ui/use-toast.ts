"use client"

import * as React from "react"
import { type ToastActionElement, type ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1000 // keep short removal delay after dismiss for animation
const DEFAULT_DURATION = 2000 // default toast visible time (2s)

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const actionTypes = {
  ADD_TOAST: "ADD_TOAST",
  UPDATE_TOAST: "UPDATE_TOAST",
  DISMISS_TOAST: "DISMISS_TOAST",
  REMOVE_TOAST: "REMOVE_TOAST",
} as const

type ActionType = typeof actionTypes
type Action =
  | { type: ActionType["ADD_TOAST"]; toast: ToasterToast }
  | { type: ActionType["UPDATE_TOAST"]; toast: Partial<ToasterToast> }
  | { type: ActionType["DISMISS_TOAST"]; toastId?: string }
  | { type: ActionType["REMOVE_TOAST"]; toastId?: string }

interface State {
  toasts: ToasterToast[]
}

const removeTimeouts = new Map<string, ReturnType<typeof setTimeout>>()
const dismissTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  if (removeTimeouts.has(toastId)) return
  const timeout = setTimeout(() => {
    removeTimeouts.delete(toastId)
    dispatch({ type: "REMOVE_TOAST", toastId })
  }, TOAST_REMOVE_DELAY)
  removeTimeouts.set(toastId, timeout)
}

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case "ADD_TOAST":
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case "UPDATE_TOAST":
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case "DISMISS_TOAST": {
      const { toastId } = action
      if (toastId) {
        // schedule actual removal after short delay to allow exit animation
        addToRemoveQueue(toastId)
      } else {
        // dismiss all: schedule removal for all
        state.toasts.forEach((t) => addToRemoveQueue(t.id))
      }
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? { ...t, open: false }
            : t
        ),
      }
    }

    case "REMOVE_TOAST":
      if (action.toastId === undefined) {
        return { ...state, toasts: [] }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []
let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => listener(memoryState))
}

function genId() {
  return Math.random().toString(36).substring(2, 9)
}

export function toast({ ...props }: Omit<ToasterToast, "id">) {
  const id = genId()

  const clearDismissTimeout = () => {
    const t = dismissTimeouts.get(id)
    if (t) {
      clearTimeout(t)
      dismissTimeouts.delete(id)
    }
  }

  const update = (props: ToasterToast) =>
    dispatch({ type: "UPDATE_TOAST", toast: { ...props, id } })
  const dismiss = () => {
    clearDismissTimeout()
    dispatch({ type: "DISMISS_TOAST", toastId: id })
  }

  dispatch({
    type: "ADD_TOAST",
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  // schedule auto-dismiss using provided duration or default
  const duration = typeof (props as any).duration === "number" ? (props as any).duration : DEFAULT_DURATION
  if (duration > 0) {
    // clear existing if any
    clearDismissTimeout()
    const dt = setTimeout(() => {
      dismissTimeouts.delete(id)
      dispatch({ type: "DISMISS_TOAST", toastId: id })
    }, duration)
    dismissTimeouts.set(id, dt)
  }

  return {
    id,
    dismiss,
    update,
  }
}

export function useToast() {
  const [state, setState] = React.useState<State>(memoryState)
  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) listeners.splice(index, 1)
    }
  }, [])
  return {
    ...state,
    toast,
    dismiss: (toastId?: string) =>
      dispatch({ type: "DISMISS_TOAST", toastId }),
  }
}
