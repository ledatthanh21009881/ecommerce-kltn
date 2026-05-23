"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useLanguage } from "@/components/language-provider"

export default function ContactPage() {
  const { t } = useLanguage()
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Form submitted:", formData)
  }

  return (
    <main className="pt-24">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-8 text-center font-serif text-3xl font-light md:text-4xl">{t('contact.title')}</h1>
          <p className="mb-12 text-center text-gray-600">{t('contact.subtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium">
                  {t('contact.name')}
                </label>
                <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
              </div>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium">
                  {t('contact.email')}
                </label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
              </div>
            </div>

            <div>
              <label htmlFor="subject" className="mb-2 block text-sm font-medium">
                {t('contact.subject')}
              </label>
              <Input id="subject" name="subject" value={formData.subject} onChange={handleChange} required />
            </div>

            <div>
              <label htmlFor="message" className="mb-2 block text-sm font-medium">
                {t('contact.message')}
              </label>
              <Textarea
                id="message"
                name="message"
                rows={6}
                value={formData.message}
                onChange={handleChange}
                required
              />
            </div>

            <Button type="submit" className="w-full bg-black text-white hover:bg-gray-800">
              {t('contact.send')}
            </Button>
          </form>
        </div>
      </div>
    </main>
  )
}
