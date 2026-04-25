'use client'

import { useState, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Bold, Italic, List, Link as LinkIcon, Heading1, Heading2, Undo, Redo } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Enter content...',
  className = ''
}: RichTextEditorProps) {
  const { t } = useLanguage()
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit')

  // Format text with HTML tags
  const formatText = (tag: string, isClosing = false) => {
    const textarea = document.getElementById('content-editor') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const beforeText = value.substring(0, start)
    const afterText = value.substring(end)

    let newValue = ''
    if (isClosing) {
      newValue = `${beforeText}</${tag}>${selectedText}</${tag}>${afterText}`
    } else {
      newValue = `${beforeText}<${tag}>${selectedText}</${tag}>${afterText}`
    }

    onChange(newValue)

    // Restore cursor position
    setTimeout(() => {
      textarea.focus()
      const newPosition = start + tag.length + 2 + (isClosing ? tag.length + 2 : 0)
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  const insertTag = (openTag: string, closeTag: string = '') => {
    const textarea = document.getElementById('content-editor') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const selectedText = value.substring(start, textarea.selectionEnd)
    const beforeText = value.substring(0, start)
    const afterText = value.substring(textarea.selectionEnd)

    const newValue = `${beforeText}${openTag}${selectedText}${closeTag}${afterText}`
    onChange(newValue)

    setTimeout(() => {
      textarea.focus()
      const newPosition = start + openTag.length + selectedText.length + closeTag.length
      textarea.setSelectionRange(newPosition, newPosition)
    }, 0)
  }

  const toolbarButtons = [
    {
      icon: Bold,
      label: 'Bold',
      onClick: () => formatText('strong')
    },
    {
      icon: Italic,
      label: 'Italic',
      onClick: () => formatText('em')
    },
    {
      icon: Heading1,
      label: 'Heading 1',
      onClick: () => insertTag('<h1>', '</h1>')
    },
    {
      icon: Heading2,
      label: 'Heading 2',
      onClick: () => insertTag('<h2>', '</h2>')
    },
    {
      icon: List,
      label: 'List',
      onClick: () => {
        const textarea = document.getElementById('content-editor') as HTMLTextAreaElement
        if (!textarea) return
        const start = textarea.selectionStart
        const beforeText = value.substring(0, start)
        const afterText = value.substring(start)
        onChange(`${beforeText}<ul>\n<li></li>\n</ul>${afterText}`)
        setTimeout(() => {
          textarea.focus()
          textarea.setSelectionRange(start + 5, start + 5)
        }, 0)
      }
    },
    {
      icon: LinkIcon,
      label: 'Link',
      onClick: () => {
        const url = prompt(t('enterUrlPrompt'))
        if (url) {
          const text = prompt(t('enterLinkTextPrompt')) || url
          const textarea = document.getElementById('content-editor') as HTMLTextAreaElement
          if (!textarea) return
          const start = textarea.selectionStart
          const beforeText = value.substring(0, start)
          const afterText = value.substring(textarea.selectionEnd)
          onChange(`${beforeText}<a href="${url}">${text}</a>${afterText}`)
          setTimeout(() => {
            textarea.focus()
            const newPosition = start + `<a href="${url}">${text}</a>`.length
            textarea.setSelectionRange(newPosition, newPosition)
          }, 0)
        }
      }
    }
  ]

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'edit' | 'preview')} className="w-full">
        <div className="border border-gray-300 rounded-t-md bg-gray-50">
          {/* Toolbar */}
          <div className="flex items-center gap-1 p-2 border-b border-gray-300">
            {toolbarButtons.map((btn, idx) => {
              const Icon = btn.icon
              return (
                <Button
                  key={idx}
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={btn.onClick}
                  className="h-8 w-8 p-0"
                  title={btn.label}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              )
            })}
            <div className="flex-1"></div>
            <TabsList className="h-8 bg-transparent">
              <TabsTrigger value="edit" className="h-8 text-xs">{t('edit')}</TabsTrigger>
              <TabsTrigger value="preview" className="h-8 text-xs">{t('preview')}</TabsTrigger>
            </TabsList>
          </div>
        </div>

        <TabsContent value="edit" className="mt-0 border border-t-0 border-gray-300 rounded-b-md">
          <Textarea
            id="content-editor"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-[200px] rounded-t-none border-t-0 focus-visible:ring-0 focus-visible:ring-offset-0 font-mono text-sm"
            style={{ fontFamily: 'monospace' }}
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-0 border border-t-0 border-gray-300 rounded-b-md">
          <div
            className="min-h-[200px] p-4 prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: value || `<p class="text-gray-400">${t('previewWillAppearHere')}</p>` }}
          />
        </TabsContent>
      </Tabs>

      <p className="text-xs text-gray-500 mt-2">
        {t('contentEditorTip')}
      </p>
    </div>
  )
}
