"use client"

import type React from "react"

import { useState } from "react"
import { Plus, Pencil, Trash2, ChevronDown, ChevronUp, Search, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"

// Mock data for categories
const initialCategories = [
  {
    id: 1,
    name: "Women's Clothing",
    slug: "womens-clothing",
    description: "All women's clothing items including tops, dresses, pants, and more.",
    image: "/placeholder.svg?height=80&width=80",
    featured: true,
    productCount: 124,
    subcategories: [
      { id: 101, name: "Dresses", slug: "dresses", productCount: 45 },
      { id: 102, name: "Tops", slug: "tops", productCount: 38 },
      { id: 103, name: "Pants", slug: "pants", productCount: 22 },
      { id: 104, name: "Skirts", slug: "skirts", productCount: 19 },
    ],
  },
  {
    id: 2,
    name: "Men's Clothing",
    slug: "mens-clothing",
    description: "All men's clothing items including shirts, pants, jackets, and more.",
    image: "/placeholder.svg?height=80&width=80",
    featured: true,
    productCount: 98,
    subcategories: [
      { id: 201, name: "Shirts", slug: "shirts", productCount: 32 },
      { id: 202, name: "Pants", slug: "pants", productCount: 28 },
      { id: 203, name: "Jackets", slug: "jackets", productCount: 18 },
      { id: 204, name: "T-shirts", slug: "t-shirts", productCount: 20 },
    ],
  },
  {
    id: 3,
    name: "Accessories",
    slug: "accessories",
    description: "Fashion accessories including jewelry, bags, hats, and more.",
    image: "/placeholder.svg?height=80&width=80",
    featured: false,
    productCount: 76,
    subcategories: [
      { id: 301, name: "Jewelry", slug: "jewelry", productCount: 25 },
      { id: 302, name: "Bags", slug: "bags", productCount: 18 },
      { id: 303, name: "Hats", slug: "hats", productCount: 15 },
      { id: 304, name: "Scarves", slug: "scarves", productCount: 18 },
    ],
  },
  {
    id: 4,
    name: "Footwear",
    slug: "footwear",
    description: "All types of footwear including shoes, boots, sandals, and more.",
    image: "/placeholder.svg?height=80&width=80",
    featured: true,
    productCount: 64,
    subcategories: [
      { id: 401, name: "Shoes", slug: "shoes", productCount: 28 },
      { id: 402, name: "Boots", slug: "boots", productCount: 16 },
      { id: 403, name: "Sandals", slug: "sandals", productCount: 20 },
    ],
  },
  {
    id: 5,
    name: "Collections",
    slug: "collections",
    description: "Special collections including seasonal and limited editions.",
    image: "/placeholder.svg?height=80&width=80",
    featured: false,
    productCount: 42,
    subcategories: [
      { id: 501, name: "Spring/Summer 2024", slug: "spring-summer-2024", productCount: 24 },
      { id: 502, name: "Fall/Winter 2023", slug: "fall-winter-2023", productCount: 18 },
    ],
  },
]

export default function CategoriesPage() {
  const [categories, setCategories] = useState(initialCategories)
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedCategories, setExpandedCategories] = useState<number[]>([])

  // Modal states
  const [isAddCategoryOpen, setIsAddCategoryOpen] = useState(false)
  const [isEditCategoryOpen, setIsEditCategoryOpen] = useState(false)
  const [isDeleteCategoryOpen, setIsDeleteCategoryOpen] = useState(false)
  const [isAddSubcategoryOpen, setIsAddSubcategoryOpen] = useState(false)

  const [currentCategory, setCurrentCategory] = useState<any>(null)
  const [currentParentId, setCurrentParentId] = useState<number | null>(null)

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    featured: false,
    image: "/placeholder.svg?height=80&width=80",
  })

  // Filter categories based on search term
  const filteredCategories = categories.filter((category) =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  // Toggle category expansion
  const toggleExpand = (categoryId: number) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  // Open edit modal with category data
  const handleEditCategory = (category: any) => {
    setCurrentCategory(category)
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description,
      featured: category.featured,
      image: category.image,
    })
    setIsEditCategoryOpen(true)
  }

  // Open delete confirmation modal
  const handleDeleteClick = (category: any) => {
    setCurrentCategory(category)
    setIsDeleteCategoryOpen(true)
  }

  // Open add subcategory modal
  const handleAddSubcategory = (parentId: number) => {
    setCurrentParentId(parentId)
    setFormData({
      name: "",
      slug: "",
      description: "",
      featured: false,
      image: "/placeholder.svg?height=80&width=80",
    })
    setIsAddSubcategoryOpen(true)
  }

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))

    // Auto-generate slug from name
    if (name === "name") {
      setFormData((prev) => ({
        ...prev,
        slug: value
          .toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^a-z0-9-]/g, ""),
      }))
    }
  }

  // Handle switch toggle for featured status
  const handleFeaturedChange = (checked: boolean) => {
    setFormData((prev) => ({ ...prev, featured: checked }))
  }

  // Add new category
  const handleAddCategory = () => {
    const newCategory = {
      id: Math.max(...categories.map((c) => c.id)) + 1,
      ...formData,
      productCount: 0,
      subcategories: [],
    }

    setCategories((prev) => [...prev, newCategory])
    setIsAddCategoryOpen(false)
    resetForm()
  }

  // Update existing category
  const handleUpdateCategory = () => {
    if (!currentCategory) return

    setCategories((prev) =>
      prev.map((category) => (category.id === currentCategory.id ? { ...category, ...formData } : category)),
    )

    setIsEditCategoryOpen(false)
    resetForm()
  }

  // Delete category
  const handleDeleteCategory = () => {
    if (!currentCategory) return

    setCategories((prev) => prev.filter((category) => category.id !== currentCategory.id))
    setIsDeleteCategoryOpen(false)
  }

  // Add subcategory
  const handleAddSubcategorySubmit = () => {
    if (currentParentId === null) return

    const newSubcategory = {
      id: Math.floor(Math.random() * 1000) + 1000,
      name: formData.name,
      slug: formData.slug,
      productCount: 0,
    }

    setCategories((prev) =>
      prev.map((category) =>
        category.id === currentParentId
          ? {
              ...category,
              subcategories: [...category.subcategories, newSubcategory],
              productCount: category.productCount, // Keep the same count for now
            }
          : category,
      ),
    )

    setIsAddSubcategoryOpen(false)
    resetForm()
  }

  // Reset form data
  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      featured: false,
      image: "/placeholder.svg?height=80&width=80",
    })
    setCurrentCategory(null)
    setCurrentParentId(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Categories Management</h1>
        <Button onClick={() => setIsAddCategoryOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search categories..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-lg border bg-white shadow">
        <div className="grid grid-cols-12 border-b bg-gray-50 p-4 text-sm font-medium text-gray-500">
          <div className="col-span-4">Category Name</div>
          <div className="col-span-3">Slug</div>
          <div className="col-span-1 text-center">Featured</div>
          <div className="col-span-2 text-center">Products</div>
          <div className="col-span-2 text-right">Actions</div>
        </div>

        <div className="divide-y">
          {filteredCategories.length > 0 ? (
            filteredCategories.map((category) => (
              <div key={category.id} className="divide-y">
                <div className="grid grid-cols-12 items-center p-4">
                  <div className="col-span-4 flex items-center space-x-3">
                    <button onClick={() => toggleExpand(category.id)} className="rounded-full p-1 hover:bg-gray-100">
                      {expandedCategories.includes(category.id) ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </button>
                    <img
                      src={category.image || "/placeholder.svg"}
                      alt={category.name}
                      className="h-10 w-10 rounded-md object-cover"
                    />
                    <span className="font-medium">{category.name}</span>
                  </div>
                  <div className="col-span-3 text-gray-600">{category.slug}</div>
                  <div className="col-span-1 text-center">
                    {category.featured ? (
                      <span className="inline-flex h-6 items-center rounded-full bg-green-100 px-2.5 text-xs font-medium text-green-800">
                        Yes
                      </span>
                    ) : (
                      <span className="inline-flex h-6 items-center rounded-full bg-gray-100 px-2.5 text-xs font-medium text-gray-800">
                        No
                      </span>
                    )}
                  </div>
                  <div className="col-span-2 text-center">{category.productCount}</div>
                  <div className="col-span-2 flex justify-end space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleAddSubcategory(category.id)}>
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEditCategory(category)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeleteClick(category)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                {/* Subcategories */}
                {expandedCategories.includes(category.id) && category.subcategories.length > 0 && (
                  <div className="bg-gray-50">
                    {category.subcategories.map((subcategory) => (
                      <div
                        key={subcategory.id}
                        className="grid grid-cols-12 items-center border-t border-gray-100 p-3 pl-12"
                      >
                        <div className="col-span-4 flex items-center space-x-3">
                          <span className="text-sm font-medium">{subcategory.name}</span>
                        </div>
                        <div className="col-span-3 text-sm text-gray-600">{subcategory.slug}</div>
                        <div className="col-span-1"></div>
                        <div className="col-span-2 text-center text-sm">{subcategory.productCount}</div>
                        <div className="col-span-2 flex justify-end space-x-2">
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="p-8 text-center text-gray-500">No categories found matching your search.</div>
          )}
        </div>
      </div>

      {/* Add Category Modal */}
      <Dialog open={isAddCategoryOpen} onOpenChange={setIsAddCategoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Category Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Summer Collection"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                placeholder="e.g., summer-collection"
              />
              <p className="text-xs text-gray-500">Used in URLs. Auto-generated from name, but you can edit it.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe this category..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="image">Category Image</Label>
              <div className="flex items-center space-x-4">
                <div className="h-20 w-20 overflow-hidden rounded-md border">
                  <img
                    src={formData.image || "/placeholder.svg"}
                    alt="Category preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <Button variant="outline" className="h-10">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Upload Image
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="featured" checked={formData.featured} onCheckedChange={handleFeaturedChange} />
              <Label htmlFor="featured">Featured Category</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCategoryOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCategory}>Add Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={isEditCategoryOpen} onOpenChange={setIsEditCategoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Category</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Category Name</Label>
              <Input id="edit-name" name="name" value={formData.name} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slug">Slug</Label>
              <Input id="edit-slug" name="slug" value={formData.slug} onChange={handleInputChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-image">Category Image</Label>
              <div className="flex items-center space-x-4">
                <div className="h-20 w-20 overflow-hidden rounded-md border">
                  <img
                    src={formData.image || "/placeholder.svg"}
                    alt="Category preview"
                    className="h-full w-full object-cover"
                  />
                </div>
                <Button variant="outline" className="h-10">
                  <ImageIcon className="mr-2 h-4 w-4" />
                  Change Image
                </Button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="edit-featured" checked={formData.featured} onCheckedChange={handleFeaturedChange} />
              <Label htmlFor="edit-featured">Featured Category</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditCategoryOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateCategory}>Update Category</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Category Confirmation */}
      <Dialog open={isDeleteCategoryOpen} onOpenChange={setIsDeleteCategoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>
              Are you sure you want to delete the category "{currentCategory?.name}"? This will also delete all
              subcategories and remove category associations from products.
            </p>
            <p className="mt-2 text-sm text-red-500">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteCategoryOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory}>
              Delete Category
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Subcategory Modal */}
      <Dialog open={isAddSubcategoryOpen} onOpenChange={setIsAddSubcategoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Subcategory</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="sub-name">Subcategory Name</Label>
              <Input
                id="sub-name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., T-shirts"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sub-slug">Slug</Label>
              <Input
                id="sub-slug"
                name="slug"
                value={formData.slug}
                onChange={handleInputChange}
                placeholder="e.g., t-shirts"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSubcategoryOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSubcategorySubmit}>Add Subcategory</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
