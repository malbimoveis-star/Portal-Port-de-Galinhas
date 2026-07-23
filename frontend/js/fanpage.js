(() => {
  const API = window.APP_CONFIG?.API_BASE_URL || "";

  function getId() {
    return new URLSearchParams(location.search).get("id");
  }

  async function carregarFanpage() {

    const id = getId();

    if (!id) {
      console.error("ID não informado");
      return;
    }

    try {

      const resposta = await fetch(`${API}/api/comerciantes/${id}`);
      const dados = await resposta.json();

      if (!dados.comerciante) return;

      const c = dados.comerciante;

      document.getElementById("nomeEmpresa").textContent =
        c.nome || "";

      document.getElementById("categoriaEmpresa").textContent =
        c.categoria || "";

      document.getElementById("descricaoEmpresa").textContent =
        c.descricao || "";

      document.getElementById("telefoneEmpresa").textContent =
        c.telefone || "";

      document.getElementById("enderecoEmpresa").textContent =
        c.endereco || "";

      if (c.logo) {
        document.getElementById("fotoPerfil").src =
          API + c.logo;
      }

      if (c.capa) {
        document.getElementById("fotoCapa").src =
          API + c.capa;
      }

      if (c.telefone) {

        const numero = c.telefone.replace(/\D/g, "");

        document.getElementById("btnWhatsapp").href =
          `https://wa.me/55${numero}`;

        document.getElementById("btnLigar").href =
          `tel:${numero}`;
      }

    } catch (erro) {

      console.error(erro);

    }

  }

  document.addEventListener("DOMContentLoaded", carregarFanpage);

})();
