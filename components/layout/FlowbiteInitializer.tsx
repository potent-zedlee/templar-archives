'use client'

import { useEffect } from 'react'

export function FlowbiteInitializer() {
  useEffect(() => {
    // Dynamically import Flowbite only on the client side
    import('flowbite').then((flowbite) => {
      // Initialize Flowbite components
      if (typeof window !== 'undefined') {
        flowbite.initFlowbite()
      }
    })
  }, [])

  return null
}
