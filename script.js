import { produtos } from '../site_de_compras/senac-26-CarrinhoCompras/data.js'

const carrinho = [];

const container = document.getElementById("produtos");

const adicionarCarrinho = (produto) =>{

   

    carrinho.push(produto);

    console.log(carrinho,'carrinho');


}

produtos.forEach(element => {
   
    // <li>
    //                 <div class="produtos">
    //                 <h3>Geladeira</h3>
    //                 <img src="imagens/Geladeira.webp" alt="Geladeira">
    //                     <span>Preço: R$ 2.300,00</span>
    //                     <button type="button">Adicionar ao Carrinho</button>
    //                 </div>
    //             </li>
    const li =document.createElement("li")
    const div =document.createElement("div")
    const h3 =document.createElement("h3")
    const img =document.createElement("img")
    const span =document.createElement("span")
    const button = document.createElement("button")
    
    div.classList.add("produtos")
    h3.innerText = element.nome
    img.src = element.imagem
    span.innerText = `R$ ${element.preco}`   
    button.innerText = "Adicionar ao carrinho"

    button.addEventListener("click",()=>{
        console.log(element,'element click')
        adicionarCarrinho(element)
    })
    container.append(li)
    li.append(div)
    div.append(h3, img, span, button)
});

