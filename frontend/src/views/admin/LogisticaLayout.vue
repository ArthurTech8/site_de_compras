<script setup lang="ts">
const abas = [
  { nome: 'logistica', rotulo: 'Painel e fila' },
  { nome: 'logistica-separacao', rotulo: 'Separação' },
  { nome: 'logistica-embalagem', rotulo: 'Embalagem' },
  { nome: 'logistica-expedicao', rotulo: 'Expedição' },
  { nome: 'logistica-estoque', rotulo: 'Estoque' },
] as const
</script>

<template>
  <section class="area-logistica">
    <div class="cabeca nao-imprimir">
      <h2 class="titulo-pagina">Logística</h2>
      <nav class="abas" aria-label="Áreas do centro de distribuição">
        <RouterLink v-for="a in abas" :key="a.nome" :to="{ name: a.nome }" class="aba" :data-aba="a.nome">{{ a.rotulo }}</RouterLink>
      </nav>
    </div>
    <RouterView />
  </section>
</template>

<style scoped>
.area-logistica {
  display: flex;
  flex-direction: column;
  gap: 18px;
  min-width: 0;
}
.cabeca {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.abas {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 2px;
  border-bottom: 2px solid var(--cor-borda);
}
.aba {
  flex-shrink: 0;
  padding: 8px 14px;
  border-radius: var(--raio-sm) var(--raio-sm) 0 0;
  margin-bottom: -4px;
  border-bottom: 3px solid transparent;
  font-weight: 600;
  font-size: 0.9375rem;
  color: var(--cor-texto-suave);
  transition:
    color 0.2s,
    background 0.2s;
}
/* No celular as cinco abas quebram em duas linhas, em vez de esconder a última. */
@media (max-width: 600px) {
  .abas {
    flex-wrap: wrap;
    gap: 2px 4px;
  }
  .aba {
    padding: 6px 10px;
    font-size: 0.875rem;
    margin-bottom: 0;
  }
}
.aba:hover {
  color: var(--cor-primaria);
  background: var(--cor-primaria-suave);
}
/* Só a aba exata: o painel é o pai das outras rotas. */
.aba.router-link-exact-active,
.aba.router-link-active:not([data-aba='logistica']) {
  color: var(--cor-primaria);
  border-bottom-color: var(--cor-destaque);
}
</style>
