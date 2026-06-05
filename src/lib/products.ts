import racao from "@/assets/product-racao.jpg";
import brinquedo from "@/assets/product-brinquedo.jpg";
import remedio from "@/assets/product-remedio.jpg";
import higiene from "@/assets/product-higiene.jpg";
import cama from "@/assets/product-cama.jpg";
import coleira from "@/assets/product-coleira.jpg";

export type Category = "Rações" | "Brinquedos" | "Remédios" | "Higiene" | "Conforto" | "Acessórios";

export type Product = {
  id: string;
  name: string;
  category: Category;
  price: number;
  image: string;
  description: string;
};

export const PRODUCTS: Product[] = [
  { id: "racao-golden-15kg", name: "Ração Golden Premium 15kg", category: "Rações", price: 289.9, image: racao, description: "Ração super premium para cães adultos, sabor frango." },
  { id: "racao-royal-7kg", name: "Royal Canin Mini Adult 7,5kg", category: "Rações", price: 259.5, image: racao, description: "Nutrição completa para cães de pequeno porte." },
  { id: "racao-gato-3kg", name: "Ração Premium Gatos 3kg", category: "Rações", price: 119.9, image: racao, description: "Para gatos castrados, controle de peso." },
  { id: "brinq-corda", name: "Brinquedo Corda Mordedor", category: "Brinquedos", price: 29.9, image: brinquedo, description: "Corda colorida resistente, ideal para cabo de guerra." },
  { id: "brinq-bola", name: "Bola de Borracha Resistente", category: "Brinquedos", price: 24.5, image: brinquedo, description: "Bola atóxica que flutua na água." },
  { id: "brinq-kit", name: "Kit Brinquedos Variados", category: "Brinquedos", price: 79.9, image: brinquedo, description: "5 brinquedos para diversão garantida." },
  { id: "rem-vermifugo", name: "Vermífugo Drontal Plus", category: "Remédios", price: 49.9, image: remedio, description: "Combate vermes em cães adultos (4 comprimidos)." },
  { id: "rem-anti-pulgas", name: "Anti-pulgas Bravecto 10-20kg", category: "Remédios", price: 169.9, image: remedio, description: "Proteção contra pulgas e carrapatos por 12 semanas." },
  { id: "rem-vitamina", name: "Suplemento Vitamínico Pet", category: "Remédios", price: 64.9, image: remedio, description: "Reforço de vitaminas e minerais." },
  { id: "hig-shampoo", name: "Shampoo Hipoalergênico 500ml", category: "Higiene", price: 39.9, image: higiene, description: "Para peles sensíveis, fragrância suave." },
  { id: "hig-escova", name: "Escova de Pelos Premium", category: "Higiene", price: 34.5, image: higiene, description: "Remove pelos mortos e desembaraça." },
  { id: "conf-cama-m", name: "Caminha Confort Média", category: "Conforto", price: 159.9, image: cama, description: "Cama acolchoada lavável, tamanho M." },
  { id: "conf-cama-g", name: "Caminha Confort Grande", category: "Conforto", price: 219.9, image: cama, description: "Para cães de grande porte." },
  { id: "ac-coleira", name: "Coleira de Couro Vermelha", category: "Acessórios", price: 59.9, image: coleira, description: "Coleira ajustável com fivela dourada." },
  { id: "ac-guia", name: "Guia Reforçada 1,5m", category: "Acessórios", price: 44.9, image: coleira, description: "Guia em couro, super resistente." },
];

export const CATEGORIES: Category[] = ["Rações", "Brinquedos", "Remédios", "Higiene", "Conforto", "Acessórios"];
