"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"

const collectionProducts = [
  {
    id: 1,
    name: "OVERSIZED BLAZER SET",
    image: "/placeholder.svg?height=800&width=600",
  },
  {
    id: 2,
    name: "GRAPHIC TEE & WIDE JEANS",
    image: "/placeholder.svg?height=800&width=600",
  },
  {
    id: 3,
    name: "TAILORED SHIRT & SHORTS",
    image: "/placeholder.svg?height=800&width=600",
  },
  {
    id: 4,
    name: "VIVIENNE TANK & TROUSERS",
    image: "/placeholder.svg?height=800&width=600",
  },
  {
    id: 5,
    name: "STRUCTURED VEST LOOK",
    image: "/placeholder.svg?height=800&width=600",
  },
  {
    id: 6,
    name: "OVERSIZED HOODIE STYLE",
    image: "/placeholder.svg?height=800&width=600",
  },
]

export default function SpringSummer2024Page() {
  return (
    <main className="pt-24">
      <div className="container mx-auto px-8 py-12">
        <div className="grid grid-cols-2 gap-16 min-h-screen">
          {/* Collection Story - Left Half */}
          <motion.div
            className="flex flex-col justify-center space-y-8 pr-8"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div>
              <h1 className="font-serif text-2xl font-light tracking-wide mb-4">SPRING SUMMER 2024</h1>
              <p className="text-gray-600 text-base">Saigon, Vietnam, May 2024</p>
            </div>

            <div className="space-y-6">
              <h2 className="font-serif text-xl font-light">"Chợ Lớn"</h2>

              <div className="space-y-4 text-gray-700 leading-relaxed text-base">
                <p>
                  GIAN SAIGON presents a collection inspired by the master artisans of Chợ Lớn, a place where cultural
                  fusion and the spirit of craftsmanship thrive. This collection honors the artistry of lion head maker
                  Trần Đức Hưng, calligrapher Kim Hy, and Hi Kích actor Diệp Gia Bửu, whose dedication and skill have
                  kept traditional crafts alive and flourishing.
                </p>
              </div>

              <div className="pt-4">
                <p className="text-base text-gray-600">Sincerely,</p>
                <p className="font-medium text-base">GIAN SAIGON</p>
              </div>
            </div>

            <div className="pt-8">
              <Link
                href="/collections"
                className="inline-block border-b border-black px-2 py-1 text-base tracking-wider transition-colors hover:text-gray-600"
              >
                View All Collections
              </Link>
            </div>
          </motion.div>

          {/* Collection Images Grid - Right Half */}
          <motion.div
            className="grid grid-cols-3 gap-4 pl-8"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {collectionProducts.map((product, index) => (
              <motion.div
                key={product.id}
                className="group relative aspect-[3/4] overflow-hidden bg-gray-100"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Image
                  src={product.image || "/placeholder.svg"}
                  alt={product.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/10" />
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Featured Products from Collection */}
        <section className="mt-24">
          <h2 className="mb-12 font-serif text-2xl font-light">Featured Pieces</h2>
          <div className="grid gap-8 grid-cols-3">
            {[
              {
                id: 1,
                name: "BLACK SIDE PLEAT WIDE LEG JEANS",
                price: "890,000 Đ",
                image: "/placeholder.svg?height=600&width=480",
              },
              {
                id: 2,
                name: "BLACK CUT-OUT LONG SLEEVE SHIRT",
                price: "690,000 Đ",
                image: "/placeholder.svg?height=600&width=480",
              },
              {
                id: 3,
                name: "SMUDGE STRAIGHT FIT JEANS",
                price: "950,000 Đ",
                image: "/placeholder.svg?height=600&width=480",
              },
            ].map((product, index) => (
              <motion.div
                key={product.id}
                className="group"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Link href={`/products/${product.id}`}>
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100">
                    <Image
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="mt-4">
                    <h3 className="font-serif text-base font-light uppercase tracking-wide">{product.name}</h3>
                    <p className="mt-2 text-gray-600 text-base">{product.price}</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </section>
      </div>
    </main>
  )
}
