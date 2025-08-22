import Link from "next/link"
import { Instagram, Facebook, Twitter } from "lucide-react"

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="font-serif text-lg">
              VIVIENNE
            </Link>
            <p className="text-sm text-gray-600">Timeless elegance for the modern individual.</p>
            <div className="flex space-x-4">
              <Link href="#" className="text-gray-600 hover:text-black">
                <Instagram className="h-5 w-5" />
                <span className="sr-only">Instagram</span>
              </Link>
              <Link href="#" className="text-gray-600 hover:text-black">
                <Facebook className="h-5 w-5" />
                <span className="sr-only">Facebook</span>
              </Link>
              <Link href="#" className="text-gray-600 hover:text-black">
                <Twitter className="h-5 w-5" />
                <span className="sr-only">Twitter</span>
              </Link>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="font-serif text-sm font-medium uppercase tracking-wider">Shop</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/collections" className="text-gray-600 hover:text-black">
                  All Collections
                </Link>
              </li>
              <li>
                <Link href="/all-products" className="text-gray-600 hover:text-black">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/collections/spring-summer-2024" className="text-gray-600 hover:text-black">
                  Spring Summer 2024
                </Link>
              </li>
              <li>
                <Link href="/sale" className="text-gray-600 hover:text-black">
                  Sale
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-serif text-sm font-medium uppercase tracking-wider">About</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/about" className="text-gray-600 hover:text-black">
                  Our Story
                </Link>
              </li>
              <li>
                <Link href="/sustainability" className="text-gray-600 hover:text-black">
                  Sustainability
                </Link>
              </li>
              <li>
                <Link href="/craftsmanship" className="text-gray-600 hover:text-black">
                  Craftsmanship
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-600 hover:text-black">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-serif text-sm font-medium uppercase tracking-wider">Customer Service</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/shipping" className="text-gray-600 hover:text-black">
                  Shipping & Returns
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-600 hover:text-black">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-gray-600 hover:text-black">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-gray-600 hover:text-black">
                  Terms & Conditions
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-8 text-center text-sm text-gray-600">
          <p>&copy; {new Date().getFullYear()} VIVIENNE. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
