import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/termos")({ component: Termos });

function Termos() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 px-4 py-10 text-sm text-fg">
      <Link to="/" className="text-muted underline">
        ← Voltar
      </Link>
      <h1 className="font-display text-2xl font-semibold">Termos de Uso — Vortex</h1>
      <p className="text-muted">Última atualização: [DATA]</p>

      <h2 className="mt-4 font-medium">1. Sobre o serviço</h2>
      <p>
        O Vortex é um aplicativo de chamadas de vídeo, chat e amizades entre usuários, operado por
        [NOME DA EMPRESA/PESSOA RESPONSÁVEL, CNPJ/CPF, ENDEREÇO]. Ao criar uma conta, você concorda
        com estes Termos e com nossa{" "}
        <Link to="/privacidade" className="underline">
          Política de Privacidade
        </Link>
        .
      </p>

      <h2 className="mt-4 font-medium">2. Cadastro e conta</h2>
      <p>
        Você deve fornecer um email válido e é responsável por manter sua senha em sigilo e por
        toda atividade realizada na sua conta. Notifique-nos imediatamente em caso de uso não
        autorizado.
      </p>

      <h2 className="mt-4 font-medium">3. Uso aceitável</h2>
      <p>Ao usar o Vortex, você concorda em não:</p>
      <ul className="list-disc pl-6">
        <li>Assediar, ameaçar ou constranger outros usuários;</li>
        <li>Enviar conteúdo ilegal, discurso de ódio ou material sexual envolvendo menores;</li>
        <li>Tentar acessar contas ou dados de terceiros sem autorização;</li>
        <li>Utilizar o serviço para spam, fraude ou distribuição de malware;</li>
        <li>Realizar engenharia reversa ou tentar comprometer a segurança da plataforma.</li>
      </ul>
      <p>Contas que violem estas regras podem ser suspensas ou excluídas sem aviso prévio.</p>

      <h2 className="mt-4 font-medium">4. Conteúdo do usuário</h2>
      <p>
        Mensagens trocadas entre usuários são armazenadas para permitir o histórico de conversas.
        Você é o único responsável pelo conteúdo que envia. Chamadas de vídeo não são gravadas nem
        armazenadas pelo Vortex.
      </p>

      <h2 className="mt-4 font-medium">5. Encerramento</h2>
      <p>
        Você pode excluir sua conta a qualquer momento em{" "}
        <Link to="/conta" className="underline">
          Minha conta
        </Link>
        , o que apaga permanentemente seus dados conforme descrito na Política de Privacidade.
        Podemos suspender ou encerrar contas que violem estes Termos.
      </p>

      <h2 className="mt-4 font-medium">6. Isenção de garantias</h2>
      <p>
        O serviço é fornecido "como está". Não garantimos disponibilidade ininterrupta, ausência
        de falhas técnicas em chamadas de vídeo (que dependem de rede/dispositivo do usuário), ou
        qualquer resultado específico do uso do serviço.
      </p>

      <h2 className="mt-4 font-medium">7. Alterações</h2>
      <p>
        Podemos atualizar estes Termos periodicamente. Mudanças relevantes serão comunicadas na
        própria plataforma.
      </p>

      <h2 className="mt-4 font-medium">8. Lei aplicável</h2>
      <p>
        Estes Termos são regidos pelas leis da República Federativa do Brasil. Fica eleito o foro
        de [CIDADE/COMARCA] para dirimir eventuais controvérsias.
      </p>

      <h2 className="mt-4 font-medium">9. Contato</h2>
      <p>Dúvidas sobre estes Termos: [email-de-contato@seudominio.com].</p>
    </main>
  );
}
