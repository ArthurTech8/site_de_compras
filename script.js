import { produtos } from '../site_de_compras/senac-26-CarrinhoCompras/data.js'


const body = document.querySelector("body")
function montarHeader() {
    const header = document.createElement("header")
    const h1 = document.createElement("h1")
    const nav = document.createElement("nav")
    const ul = document.createElement("ul")
    const li = document.createElement("li")
    const a = document.createElement("a")

    h1.innerText = "Bem-vindo à nossa Loja Online!"
    a.innerText = "Carrinho"

    header.append(h1, nav)
    nav.append(ul)
    ul.append(li, a)
    body.append(header);
}
montarHeader()










const carrinho = [];



const adicionarCarrinho = (produto) =>{

   

    carrinho.push(produto);
    const listaCarrinho = document.querySelector("#carrinho-lista")
    const li = document.createElement("li")
    const nome = document.createElement("nome")
    const preco = document.createElement("preco")
    const img = document.createElement("img")
    nome.innerText = produto.nome 
    preco.innerText = `R$ ${produto.preco}`
    img.src = produto.imagem
    li.append(img, nome, preco)
    listaCarrinho.append(li)
 
    
    console.log(carrinho,'carrinho');


}

produtos.forEach(element => {
   const container = document.getElementById("produtos");
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
    // body.appendChild(container);
});

