"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"

export default function Newsletter() {
  const [email, setEmail] = useState("")
  const [isSubmitted, setIsSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (email) {
      setIsSubmitted(true)
    }
  }

  return (
    <section className="bg-gray-50 py-24">
      <div className="container mx-auto px-4">
        <motion.div
          className="mx-auto max-w-md text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
        >
          <h2 className="font-serif text-2xl font-light md:text-3xl">Join Our Newsletter</h2>
          <p className="mt-4 text-gray-600">
            Subscribe to receive updates on new collections, special offers and styling advice.
          </p>
          {!isSubmitted ? (
            <form onSubmit={handleSubmit} className="mt-6">
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="email"
                  placeholder="Your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 border-gray-300 bg-white"
                  required
                />
                <Button type="submit" className="h-12 bg-black text-white hover:bg-gray-800">
                  Subscribe
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-6 rounded-md border border-gray-200 bg-white p-4">
              <p className="text-sm text-gray-600">Thank you for subscribing. We'll be in touch soon.</p>
            </div>
          )}
        </motion.div>
      </div>
    </section>
  )
}
