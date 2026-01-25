import Image from "next/image"
import Link from "next/link"

export default function AboutPage() {
  return (
    <main className="pt-24">
      <div className="p-8 max-w-[85%] ml-[224px] mr-8">
        {/* Header */}
        <section className="mb-16 text-center">
          <h1 className="font-serif text-3xl font-light md:text-4xl">Our Beginning</h1>
        </section>

        {/* Main Content */}
        <section className="mb-24">
          <div className="grid grid-cols-5 gap-16 items-center">
            {/* Text Content - Left Side */}
            <div className="col-span-2 space-y-6">
              <p className="text-gray-700 text-base leading-relaxed">
                MAISON was founded in 2015 with a simple vision: to create clothing that stands the test of time, both
                in design and quality. Our founder, Claire Laurent, envisioned a brand that would celebrate the beauty
                of simplicity and the value of thoughtful craftsmanship.
              </p>

              <p className="text-gray-700 text-base leading-relaxed">
                After years in the fashion industry, Claire saw an opportunity to create a label that would prioritize
                quality over quantity, and design integrity over fleeting trends. MAISON was born from this philosophy,
                and continues to embody these values in every piece we create.
              </p>
            </div>

            {/* Image - Right Side */}
            <div className="col-span-3">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-gray-100">
                <Image
                  src="/placeholder.svg?height=600&width=800"
                  alt="Claire Laurent working at her desk"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="mb-24">
          <h2 className="mb-12 text-center font-serif text-3xl font-light">Our Values</h2>
          <div className="grid gap-12 md:grid-cols-3">
            <div className="text-center">
              <h3 className="font-serif text-xl font-light mb-4">Sustainability</h3>
              <p className="text-gray-600 text-base leading-relaxed">
                We prioritize eco-friendly materials and ethical production methods in everything we do, ensuring our
                impact on the planet is minimal.
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-serif text-xl font-light mb-4">Quality</h3>
              <p className="text-gray-600 text-base leading-relaxed">
                Each piece is crafted with meticulous attention to detail and built to last for years to come,
                representing true value.
              </p>
            </div>
            <div className="text-center">
              <h3 className="font-serif text-xl font-light mb-4">Timelessness</h3>
              <p className="text-gray-600 text-base leading-relaxed">
                Our designs transcend seasonal trends, offering versatile pieces that remain relevant and beautiful over
                time.
              </p>
            </div>
          </div>
        </section>

        {/* Philosophy Section */}
        <section className="mb-24">
          <div className="grid gap-16 md:grid-cols-2 md:items-center">
            <div className="relative aspect-square overflow-hidden bg-gray-100">
              <Image
                src="/placeholder.svg?height=600&width=600"
                alt="Our atelier workspace"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h2 className="font-serif text-3xl font-light mb-6">Our Philosophy</h2>
              <p className="text-gray-600 text-base leading-relaxed mb-4">
                We believe that true style comes from understanding yourself and choosing pieces that reflect your
                authentic self. Our collections are designed to be building blocks for a thoughtful wardrobe.
              </p>
              <p className="text-gray-600 text-base leading-relaxed mb-4">
                Every garment we create is a testament to our commitment to excellence, from the initial sketch to the
                final stitch. We work with skilled artisans who share our passion for quality and attention to detail.
              </p>
              <p className="text-gray-600 text-base leading-relaxed">
                Fashion should be a force for good, which is why we're committed to transparent practices and continuous
                improvement in our sustainability efforts.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="text-center">
          <h2 className="font-serif text-3xl font-light mb-6">Explore Our Collections</h2>
          <p className="text-gray-600 text-base mb-8 max-w-2xl mx-auto">
            Discover pieces that embody our commitment to timeless design and sustainable fashion. Each collection tells
            a story of craftsmanship and conscious creation.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/collections"
              className="inline-block border border-black px-8 py-3 text-center text-base transition-colors hover:bg-black hover:text-white"
            >
              View Collections
            </Link>
            <Link
              href="/all-products"
              className="inline-block border border-gray-300 px-8 py-3 text-center text-base transition-colors hover:border-black"
            >
              Shop All Products
            </Link>
          </div>
        </section>
      </div>
    </main>
  )
}
