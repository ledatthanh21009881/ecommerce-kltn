"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { motion } from "framer-motion"

const searchResults = [
  {
    id: 1,
    name: "BLACK SIDE PLEAT WIDE LEG JEANS",
    price: "890,000 Đ",
    image: "/placeholder.svg?height=600&width=480",
    category: "Bottoms",
  },
  {
    id: 2,
    name: "BLACK CUT-OUT LONG SLEEVE SHIRT",
    price: "690,000 Đ",
    image: "/placeholder.svg?height=600&width=480",
    category: "Tops",
  },
  {
    id: 3,
    name: "VIVIENNE SILK BLOUSE",
    price: "1,200,000 Đ",
    image: "/placeholder.svg?height=600&width=480",
    category: "Tops",
  },
]

export default function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [results, setResults] = useState([])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    if (query.length > 2) {
      const filtered = searchResults.filter((product) => product.name.toLowerCase().includes(query.toLowerCase()))
      setResults(filtered)
    } else {
      setResults([])
    }
  }

  return (
    <main className="pt-24 pl-[185px] pb-[170px]">
      <div className="container mx-auto px-4 py-12">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-8 text-center font-serif text-3xl font-light md:text-4xl">Search</h1>

          <div className="relative mb-12">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <Input
              type="text"
              placeholder="Search for products..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-12 text-lg"
            />
          </div>

          {searchQuery && results.length === 0 && (
            <p className="text-center text-gray-600">No results found for "{searchQuery}"</p>
          )}

          {results.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((product, index) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group"
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
                      <p className="mt-2 text-base text-gray-600">{product.price}</p>
                      <p className="mt-1 text-sm text-gray-500">{product.category}</p>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
