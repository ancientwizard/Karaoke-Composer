<template>
  <div class="container-fluid p-4">
    <div class="row">
      <div class="col">
        <div class="alert alert-warning" role="alert">
          <h4 class="alert-heading">
            <i class="bi bi-exclamation-triangle"></i>
            404 - Page Not Found
          </h4>
          <p>The page you are looking for does not exist.</p>
          <hr />
          <router-link to="/" class="btn btn-primary btn-sm">
            <i class="bi bi-house"></i>
            Back to Home
          </router-link>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
// NotFound page
</script>

<style scoped>
/* No additional styles needed */
</style>
