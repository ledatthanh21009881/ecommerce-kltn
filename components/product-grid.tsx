"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"

const products = [
  {
    id: 1,
    name: "VIVIENNE Silk Blouse",
    price: "$120",
    image: "/placeholder.svg?height=600&width=480",
    hoverImage: "/placeholder.svg?height=600&width=480",
    category: "Tops",
  },
  {
    id: 2,
    name: "Tailored Wool Trousers",
    price: "$180",
    image: "/placeholder.svg?height=600&width=480",
    hoverImage: "/placeholder.svg?height=600&width=480",
    category: "Bottoms",
  },
  {
    id: 3,
    name: "Structured Canvas Tote",
    price: "$95",
    image: "/placeholder.svg?height=600&width=480",
    hoverImage: "/placeholder.svg?height=600&width=480",
    category: "Accessories",
  },
  {
    id: 4,
    name: "Oversized Cashmere Sweater",
    price: "$220",
    image: "/placeholder.svg?height=600&width=480",
    hoverImage: "/placeholder.svg?height=600&width=480",
    category: "Tops",
  },
]

export default function ProductGrid() {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}

function ProductCard({ product }) {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <motion.div
      className="product-card group"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link href={`/products/${product.id}`}>
        <div className="relative aspect-[4/5] w-full overflow-hidden">
          <Image
            src={isHovered ? product.hoverImage : product.image}
            alt={product.name}
            fill
            className="product-image object-cover"
          />
          <div className="product-info">
            <p className="text-xs text-gray-500">{product.category}</p>
            <h3 className="font-serif text-lg font-light">{product.name}</h3>
            <p className="mt-1 text-sm">{product.price}</p>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}
