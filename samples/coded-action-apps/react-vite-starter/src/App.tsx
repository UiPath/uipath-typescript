import { useEffect, useState } from 'react'
import type { Task } from '@uipath/coded-action-app'
import { codedActionApp } from './uipath'

function App() {
  const [task, setTask] = useState<Task | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  useEffect(() => {
    codedActionApp.getTask().then(setTask, (error: unknown) => {
      console.error('Could not load the task:', error)
      setLoadFailed(true)
    })
  }, [])

  if (loadFailed) {
    return (
      <main>
        <p>Couldn't load the task. Open this app from an Action Center task.</p>
      </main>
    )
  }
  if (!task) {
    return (
      <main>
        <p>Loading task…</p>
      </main>
    )
  }
  return (
    <main>
      <h1>{task.title}</h1>
      <p>
        Edit <code>src/App.tsx</code> to build the task form, then call{' '}
        <code>codedActionApp.completeTask()</code> to complete the task.
      </p>
    </main>
  )
}

export default App
