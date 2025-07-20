# Migração para PostgreSQL

Este documento descreve como migrar o sistema de armazenamento em arquivos para PostgreSQL.

## Pré-requisitos

1. PostgreSQL instalado e rodando
2. Node.js e npm
3. Dados antigos (opcional, para migração)

## Configuração Inicial

### 1. Instalar Dependências

As dependências já foram instaladas automaticamente:
- `typeorm@0.2.45` - ORM compatível com Node.js antigo
- `pg@8.8.0` - Driver PostgreSQL
- `reflect-metadata@0.1.13` - Metadados para TypeORM
- `dotenv@8.6.0` - Carregar variáveis de ambiente

### 2. Configurar Variáveis de Ambiente

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=coding_tracker
DB_SSL=false
NODE_ENV=development
USE_FILE_STORAGE_FALLBACK=false
```

### 3. Configurar Banco de Dados

```bash
npm run setup-database
```

Este comando irá:
- Conectar ao PostgreSQL
- Criar o banco de dados `coding_tracker` se não existir
- Testar as permissões

## Migração de Dados Antigos (Opcional)

Se você tem dados antigos em arquivos `.db`, pode migrá-los:

```bash
npm run migrate-to-postgres
```

Ou manualmente:

```bash
node migrate-to-postgres.js ./database
```

## Estrutura do Banco de Dados

### Tabela `coding_activities`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | SERIAL PRIMARY KEY | ID único |
| type | INTEGER | Tipo de atividade (0=open, 1=look, 2=code) |
| time | BIGINT | Timestamp em milliseconds |
| duration | INTEGER | Duração em milliseconds |
| language | VARCHAR(100) | Linguagem de programação |
| file | TEXT | Caminho do arquivo |
| project | TEXT | Caminho do projeto |
| computer_id | VARCHAR(100) | ID do computador |
| vcs_type | VARCHAR(50) | Tipo de controle de versão |
| vcs_repo | TEXT | Repositório |
| vcs_branch | VARCHAR(200) | Branch |
| line | INTEGER | Linha no arquivo |
| char | INTEGER | Posição do caractere |
| created_at | TIMESTAMP | Data de criação |

### Índices

- `IDX_TIME` - Para consultas por data
- `IDX_PROJECT` - Para filtros por projeto
- `IDX_LANGUAGE` - Para filtros por linguagem
- `IDX_COMPUTER_ID` - Para filtros por computador
- `IDX_CREATED_AT` - Para ordenação cronológica

## APIs Disponíveis

### Novos Endpoints (PostgreSQL)

Quando usando PostgreSQL, os seguintes endpoints ficam disponíveis:

#### `/ajax/report-v3`
Retorna atividades de codificação com filtros avançados.

**Parâmetros:**
- `startDate` - Data de início (ISO string)
- `endDate` - Data de fim (ISO string)
- `projects[]` - Filtro por projetos
- `languages[]` - Filtro por linguagens
- `computers[]` - Filtro por computadores
- `files[]` - Filtro por arquivos
- `limit` - Limite de registros
- `offset` - Offset para paginação

#### `/ajax/statistics`
Retorna estatísticas agregadas e timeline.

**Parâmetros:**
- Mesmos filtros do `/ajax/report-v3`
- `groupBy` - Agrupamento da timeline: 'hour', 'day', 'week', 'month'

#### `/ajax/filters`
Retorna listas de valores únicos para filtros.

**Retorna:**
```json
{
  "success": true,
  "filters": {
    "projects": ["projeto1", "projeto2"],
    "languages": ["javascript", "python"],
    "computers": ["computer1", "computer2"]
  }
}
```

## Arquivos Principais

### Storage
- `lib/StorageAdapter.js` - Adaptador que decide entre arquivo ou PostgreSQL
- `lib/StoragePostgres.js` - Storage para PostgreSQL
- `lib/Storage.js` - Storage original (arquivo)

### Database
- `lib/database/Database.js` - Configuração e conexão
- `lib/database/entities/CodingActivity.js` - Entidade TypeORM
- `lib/database/DataReader.js` - Leitura de dados

### Reports
- `lib/analyze/ReportMiddlewareV3.js` - Middleware para PostgreSQL

### Scripts
- `setup-database.js` - Configuração inicial do banco
- `migrate-to-postgres.js` - Migração de dados antigos

## Modo de Compatibilidade

O sistema suporta fallback para arquivos caso o PostgreSQL não esteja disponível:

1. Define `USE_FILE_STORAGE_FALLBACK=true` no `.env`
2. Se falhar ao conectar no PostgreSQL, usa automaticamente arquivos
3. Logs indicam qual storage está sendo usado

## Troubleshooting

### Erro de Conexão PostgreSQL

```bash
# Verificar se PostgreSQL está rodando
sudo service postgresql status

# Verificar configurações no .env
cat .env

# Testar conexão manualmente
npm run setup-database
```

### Erro de Migração

```bash
# Verificar arquivos de dados antigos
ls -la ./database/*.db

# Executar migração com logs
DEBUG=true node migrate-to-postgres.js ./database
```

### Performance

Para melhor performance com grandes volumes de dados:

1. Considere usar índices adicionais
2. Configure `synchronize: false` e use migrations
3. Ajuste configurações do PostgreSQL
4. Use connection pooling

## Próximos Passos

1. Testar todas as funcionalidades
2. Configurar backup automático
3. Implementar migrations para updates futuros
4. Monitorar performance
5. Documentar queries customizadas
