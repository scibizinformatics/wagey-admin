<template>
  <q-page class="select-company-page q-pa-md">
    <div class="company-container q-mx-auto">
      <h2 class="text-center q-mb-lg">Select Your Company</h2>

      <q-list bordered padding>
        <q-item
          v-for="company in companies"
          :key="company.id"
          clickable
          @click="selectCompany(company)"
        >
          <q-item-section>
            <q-item-label>{{ company.name || company.company_name || company.title }}</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-icon name="chevron_right" />
          </q-item-section>
        </q-item>
      </q-list>

      <div v-if="companies.length === 0" class="text-center q-mt-md text-grey-6">
        No companies found.
      </div>
    </div>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useQuasar } from 'quasar'

const $q = useQuasar()
const router = useRouter()
const companies = ref([])

// Fetch companies from localStorage
onMounted(() => {
  try {
    const storedCompanies = localStorage.getItem('userCompanies')
    if (storedCompanies) {
      companies.value = JSON.parse(storedCompanies)
    }
  } catch (err) {
    console.error('Failed to load companies:', err)
  }
})

const selectCompany = (company) => {
  try {
    // Store selected company ID and name
    localStorage.setItem('companyId', company.id)
    const companyName = company.name || company.company_name || company.title
    if (companyName) localStorage.setItem('companyName', companyName)

    $q.notify({
      type: 'positive',
      message: `Selected company: ${companyName}`,
      position: $q.screen.xs ? 'bottom' : 'top',
      timeout: 2000,
    })

    // Redirect to dashboard after selection
    router.push('/app')
  } catch (err) {
    console.error('Error selecting company:', err)
    $q.notify({
      type: 'negative',
      message: 'Failed to select company. Please try again.',
    })
  }
}
</script>

<style scoped>
.select-company-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}

.company-container {
  width: 100%;
  max-width: 400px;
}

.q-item {
  cursor: pointer;
}
</style>
