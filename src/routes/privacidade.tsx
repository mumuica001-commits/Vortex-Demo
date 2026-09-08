import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacidade")({ component: Privacidade });

function Privacidade() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 py-10 text-sm text-fg">
      <Link to="/" className="text-muted underline">
        ← Voltar
      </Link>
      <h1 className="font-display text-2xl font-semibold">Política de Privacidade — Vortex</h1>
      <p className="text-muted">Última atualização: [DATA]</p>
      <p>
        Esta Política descreve como tratamos seus dados pessoais, em conformidade com a Lei Geral
        de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
      </p>

      <h2 className="mt-4 font-medium">1. Controlador dos dados</h2>
      <p>
        [NOME DA EMPRESA/PESSOA RESPONSÁVEL], inscrita no CNPJ/CPF [NÚMERO], é a controladora dos
        dados pessoais tratados nesta plataforma. Contato do Encarregado de Dados (DPO):
        [dpo@seudominio.com].
      </p>

      <h2 className="mt-4 font-medium">2. Dados que coletamos</h2>
      <ul className="list-disc pl-6">
        <li>Cadastro: nome, email e senha (armazenada apenas como hash, nunca em texto puro);</li>
        <li>Perfil: nome de usuário público e nome de exibição;</li>
        <li>Uso do serviço: lista de amigos, convites de chamada, mensagens de chat privado;</li>
        <li>
          Dados técnicos: endereço IP, tipo de dispositivo/navegador e timestamps de sessão, para
          segurança e prevenção de abuso;
        </li>
        <li>
          Câmera e microfone: usados apenas durante uma chamada ativa, transmitidos diretamente
          entre os participantes (peer-to-peer/WebRTC) — o Vortex não grava nem armazena áudio ou
          vídeo das chamadas.
        </li>
      </ul>

      <h2 className="mt-4 font-medium">3. Por que tratamos seus dados</h2>
      <ul className="list-disc pl-6">
        <li>Execução do contrato: para fornecer login, chamadas, chat e amizades;</li>
        <li>Legítimo interesse: segurança, prevenção de fraude e abuso da plataforma;</li>
        <li>Consentimento: aceite dos Termos de Uso e desta Política no cadastro.</li>
      </ul>

      <h2 className="mt-4 font-medium">4. Com quem compartilhamos</h2>
      <p>
        Não vendemos nem compartilhamos seus dados com terceiros para fins de publicidade.
        Utilizamos provedores de infraestrutura (hospedagem e banco de dados) para operar o
        serviço — [NOMEAR PROVEDORES, ex: Vercel/Neon], que podem processar dados em servidores
        localizados fora do Brasil. Esses provedores atuam como operadores, sob nossas instruções,
        e mantemos apenas os prestadores necessários à operação do serviço.
      </p>

      <h2 className="mt-4 font-medium">5. Por quanto tempo guardamos seus dados</h2>
      <p>
        Mantemos seus dados enquanto sua conta existir. Ao excluir sua conta, todos os seus dados
        (perfil, amizades, mensagens enviadas e recebidas, convites) são apagados permanentemente
        e de forma imediata — não mantemos backups de longo prazo de contas excluídas.
      </p>

      <h2 className="mt-4 font-medium">6. Seus direitos (Art. 18 da LGPD)</h2>
      <p>Você pode, a qualquer momento, na página{" "}
        <Link to="/conta" className="underline">
          Minha conta
        </Link>
        :</p>
      <ul className="list-disc pl-6">
        <li>Confirmar a existência de tratamento e acessar seus dados;</li>
        <li>Baixar uma cópia completa dos seus dados (portabilidade);</li>
        <li>Corrigir dados incompletos, inexatos ou desatualizados;</li>
        <li>Excluir permanentemente sua conta e todos os dados associados;</li>
        <li>Revogar o consentimento dado no cadastro (o que implica exclusão da conta).</li>
      </ul>
      <p>
        Para solicitações que não estejam disponíveis diretamente no app, entre em contato com
        nosso Encarregado de Dados em [dpo@seudominio.com].
      </p>

      <h2 className="mt-4 font-medium">7. Segurança</h2>
      <p>
        Senhas são armazenadas com hash (nunca em texto puro), conexões usam HTTPS/TLS, e
        aplicamos cabeçalhos de segurança e limitação de tentativas de login para reduzir riscos de
        acesso indevido. Nenhum sistema é 100% livre de falhas; em caso de incidente de segurança
        relevante, notificaremos os usuários afetados e a Autoridade Nacional de Proteção de Dados
        (ANPD) conforme exigido pela LGPD.
      </p>

      <h2 className="mt-4 font-medium">8. Cookies</h2>
      <p>
        Usamos apenas um cookie estritamente necessário para manter sua sessão de login. Não
        usamos cookies de rastreamento ou publicidade de terceiros.
      </p>

      <h2 className="mt-4 font-medium">9. Menores de idade</h2>
      <p>
        O Vortex não é destinado a menores de 18 anos sem consentimento dos pais/responsáveis,
        conforme exigido pela LGPD para o tratamento de dados de crianças e adolescentes.
      </p>

      <h2 className="mt-4 font-medium">10. Alterações</h2>
      <p>
        Podemos atualizar esta Política periodicamente. A data da última atualização está sempre
        indicada no topo desta página.
      </p>
    </main>
  );
}
