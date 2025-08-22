"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"

export default function BrandStory() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="grid gap-12 md:grid-cols-2 md:items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="font-serif text-3xl font-light md:text-4xl">Our Philosophy</h2>
            <p className="mt-6 text-gray-600">
              We believe in creating timeless pieces that transcend seasonal trends. Each garment is thoughtfully
              designed with attention to detail, quality materials, and ethical production methods.
            </p>
            <p className="mt-4 text-gray-600">
              Our commitment to sustainability guides every decision we make, from sourcing materials to packaging and
              shipping. We strive to minimize our environmental impact while maximizing the longevity and versatility of
              our designs.
            </p>
            <Link
              href="/about"
              className="mt-8 inline-block border-b border-black px-2 py-1 text-sm tracking-wider transition-colors hover:text-gray-600"
            >
              Learn More About Our Story
            </Link>
          </motion.div>
          <motion.div
            className="relative aspect-square overflow-hidden"
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <Image src="/placeholder.svg?height=800&width=800" alt="Behind the scenes" fill className="object-cover" />
          </motion.div>
        </div>
      </div>
    </section>
  )
}
