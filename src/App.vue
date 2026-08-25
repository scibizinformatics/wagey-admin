<template>
  <router-view />
  <!-- Single global toast host: teleports to <body>, so it survives route and
       layout changes and covers login as well as the authenticated app. -->
  <AppToast />
</template>

<script setup>
import AppToast from 'src/components/common/AppToast.vue'
</script>
