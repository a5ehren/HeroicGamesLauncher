import ContextProvider from 'frontend/state/ContextProvider'
import { useEffect, useContext, ReactElement } from 'react'

export const hasHelp = (
  helpItemId: string,
  title: string,
  content: ReactElement
) => {
  const { help } = useContext(ContextProvider)

  useEffect(() => {
    help.addHelpItem(helpItemId, {
      title,
      content
    })

    return () => {
      help.removeHelpItem(helpItemId)
    }
  }, [])
}
