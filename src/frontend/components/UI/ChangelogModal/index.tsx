import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader } from '../Dialog'
import ReactMarkdown from 'react-markdown'
import { Release } from 'common/types'
import './index.scss'

type Props = {
  onClose: () => void
  dimissVersionCheck?: boolean
}

const storage = window.localStorage
const lastChangelog = storage.getItem('last_changelog')?.replaceAll('"', '')

export function ChangelogModal({ onClose, dimissVersionCheck }: Props) {
  const [currentChangelog, setCurrentChangelog] = useState<Release | null>(null)

  useEffect(() => {
    if (!currentChangelog) {
      void window.api.getHeroicVersion().then((version) => {
        if (dimissVersionCheck || version !== lastChangelog) {
          void window.api
            .getCurrentChangelog()
            .then((release) => setCurrentChangelog(release))
        }
      })
    }
  }, [currentChangelog, dimissVersionCheck])

  if (!currentChangelog) {
    return null
  }

  return (
    <Dialog onClose={onClose} showCloseButton={true}>
      <DialogHeader>
        <div>{currentChangelog.name}</div>
      </DialogHeader>
      <DialogContent className="changelogModalContent">
        {currentChangelog.body && (
          <ReactMarkdown
            components={{
              a: ({ ...props }) => (
                <a {...props} target="_blank" rel="noopener noreferrer" />
              )
            }}
          >
            {currentChangelog.body}
          </ReactMarkdown>
        )}
      </DialogContent>
    </Dialog>
  )
}
