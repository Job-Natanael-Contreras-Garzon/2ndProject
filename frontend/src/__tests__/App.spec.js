import { describe, it, expect } from 'vitest'

import { shallowMount } from '@vue/test-utils'
import App from '../App.vue'

describe('App', () => {
  it('mounts renders properly', () => {
    const wrapper = shallowMount(App, {
      global: {
        stubs: { RouterView: true },
      },
    })
    expect(wrapper.exists()).toBe(true)
  })
})
