"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Filter, Grid, List, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"

const products = [
  {
    id: 1,
    name: "BLACK SIDE PLEAT WIDE LEG JEANS",
    price: "890,000 Đ",
    image: "/placeholder.svg?height=600&width=480",
    category: "Bottoms",
    collection: "Spring Summer 2024",
  },
  {
    id: 2,
    name: "BLACK CUT-OUT LONG SLEEVE SHIRT",
    price: "690,000 Đ",
    image: "/placeholder.svg?height=600&width=480",
    category: "Tops",
    collection: "Spring Summer 2024",
  },
  {
    id: 3,
    name: "SMUDGE STRAIGHT FIT JEANS",
    price: "950,000 Đ",
    image: "/placeholder.svg?height=600&width=480",
    category: "Bottoms",
    collection: "Spring Summer 2024",
  },
  {
    id: 4,
    name: "OVERSIZED BLAZER",
    price: "1,200,000 Đ",
    image: "/placeholder.svg?height=600&width=480",
    category: "Outerwear",
    collection: "Spring Summer 2024",
  },
  {
    id: 5,
    name: "GRAPHIC PRINT TEE",
    price: "450,000 Đ",
    image: "/placeholder.svg?height=600&width=480",
    category: "Tops",
    collection: "Spring Summer 2024",
  },
  {
    id: 6,
    name: "TAILORED SHORTS",
    price: "680,000 Đ",
    image: "/placeholder.svg?height=600&width=480",
    category: "Bottoms",
    collection: "Spring Summer 2024",
  },
]

const categories = ["All", "Tops", "Bottoms", "Outerwear"]
const sortOptions = ["Featured", "Price: Low to High", "Price: High to Low", "Newest", "Best Selling"]

export default function CollectionsPage() {
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [sortBy, setSortBy] = useState("Featured")
  const [viewMode, setViewMode] = useState("grid")
  const [showFilters, setShowFilters] = useState(false)

  const filteredProducts = products.filter(
    (product) => selectedCategory === "All" || product.category === selectedCategory,
  )

  return (
    <main className="pt-24">
      <div className="container mx-auto px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="font-serif text-3xl font-light md:text-4xl">All Collections</h1>
          <p className="mt-4 text-gray-600 text-base">Discover our complete range of VIVIENNE designs</p>
        </div>

        {/* Filters and Sort */}
        <div className="mb-8 flex flex-col gap-4 border-b border-gray-200 pb-6 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-4">
            {/* Category Filter */}
            <div className="flex gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4 py-2 text-base transition-colors ${
                    selectedCategory === category
                      ? "bg-black text-white"
                      : "border border-gray-300 text-gray-700 hover:border-black"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Mobile Filter Button */}
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="md:hidden">
              <Filter className="mr-2 h-4 w-4" />
              Filters
            </Button>
          </div>

          <div className="flex items-center gap-4">
            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="appearance-none border border-gray-300 bg-white px-4 py-2 pr-8 text-base focus:border-black focus:outline-none"
              >
                {sortOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* View Mode Toggle */}
            <div className="flex border border-gray-300">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 ${viewMode === "grid" ? "bg-black text-white" : "text-gray-700"}`}
              >
                <Grid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 ${viewMode === "list" ? "bg-black text-white" : "text-gray-700"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Products Count */}
        <div className="mb-8">
          <p className="text-base text-gray-600">{filteredProducts.length} products</p>
        </div>

        {/* Products Grid */}
        <div className={`grid gap-6 ${viewMode === "grid" ? "grid-cols-3" : "grid-cols-1"}`}>
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`group ${viewMode === "list" ? "flex gap-6" : ""}`}
            >
              <Link href={`/products/${product.id}`}>
                <div
                  className={`relative overflow-hidden bg-gray-100 ${
                    viewMode === "list" ? "h-64 w-48 flex-shrink-0" : "aspect-[3/4] w-full"
                  }`}
                >
                  <Image
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                </div>
                <div className={`${viewMode === "list" ? "flex-1 py-2" : "mt-4"}`}>
                  <h3 className="font-serif text-base font-light uppercase tracking-wide">{product.name}</h3>
                  <p className="mt-2 text-base text-gray-600">{product.price}</p>
                  {viewMode === "list" && <p className="mt-1 text-base text-gray-500">{product.category}</p>}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Load More Button */}
        <div className="mt-16 flex justify-center">
          <Button variant="outline" className="px-8 py-3 text-base">
            Load More Products
          </Button>
        </div>
      </div>
    </main>
  )
}
