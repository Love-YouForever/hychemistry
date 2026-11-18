<template>
  <div class="btn-group-left">
    <a
      href="./pages/Periodic_Table/交互式元素周期表/交互式元素周期表3D.html"
      class="btn btn-primary"
      id="exploreBtn"
      @click.prevent="go('./pages/Periodic_Table/交互式元素周期表/交互式元素周期表3D.html')"
      >🔬 周期表</a
    >
    <a
      href="./pages/Chemical_equation/equation_cloud.html"
      class="btn btn-outline"
      id="detailBtn"
      @click.prevent="go('./pages/Chemical_equation/equation_cloud.html')"
      >⚗️ 方程式</a
    >
    <a
      href="./pages/chemistry_lab/lab.html"
      class="btn btn-primary"
      id="labBtn"
      @click.prevent="go('./pages/chemistry_lab/lab.html')"
      >🧪 实验室</a
    >
  </div>
  <div class="btn-group-right">
    <a
      href="./pages/Chemical_Epics/化学史诗.html"
      class="btn btn-primary"
      id="interactiveBtn"
      @click.prevent="go('./pages/Chemical_Epics/化学史诗.html')"
      >📜 化学史诗</a
    >
    <a
      href="./pages/games/games.html"
      class="btn btn-primary"
      id="miniGameBtn"
      @click.prevent="go('./pages/games/games.html')"
      >🎮 小游戏</a
    >
    <a href="./pages/surprise.html" class="btn btn-primary" id="unfinishedBtn" @click.prevent="go('./pages/surprise.html')"
      >✨ 未完待续</a
    >
  </div>
</template>

<script setup lang="ts">
function go(url: string): void {
  window.location.href = url
}
</script>
