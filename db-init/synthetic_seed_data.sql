--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
--SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: instructions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.instructions (
    id integer NOT NULL,
    transaction_id integer,
    program text,
    instruction_type text,
    from_address text,
    to_address text,
    lamports bigint
);


ALTER TABLE public.instructions OWNER TO postgres;

--
-- Name: instructions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.instructions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.instructions_id_seq OWNER TO postgres;

--
-- Name: instructions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.instructions_id_seq OWNED BY public.instructions.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id integer NOT NULL,
    transaction_hash text NOT NULL,
    status text,
    block_time timestamp without time zone,
    fee bigint,
    signer text,
    source text,
    inserted_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.transactions OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO postgres;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: wallet_balances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.wallet_balances (
    id integer NOT NULL,
    address text NOT NULL,
    balance_lamports bigint NOT NULL,
    balance_sol numeric(20,9) GENERATED ALWAYS AS (((balance_lamports)::numeric / '1000000000'::numeric)) STORED,
    token text DEFAULT 'SOL'::text,
    source text,
    retrieved_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.wallet_balances OWNER TO postgres;

--
-- Name: wallet_balances_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.wallet_balances_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.wallet_balances_id_seq OWNER TO postgres;

--
-- Name: wallet_balances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.wallet_balances_id_seq OWNED BY public.wallet_balances.id;


--
-- Name: instructions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instructions ALTER COLUMN id SET DEFAULT nextval('public.instructions_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: wallet_balances id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_balances ALTER COLUMN id SET DEFAULT nextval('public.wallet_balances_id_seq'::regclass);


--
-- Data for Name: instructions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.instructions (id, transaction_id, program, instruction_type, from_address, to_address, lamports) FROM stdin;
1	5	spl-token	transfer	925f7f946d2e4b72aa005722182ebd3a	e2333953463f40e39788337242e40305	415387
2	8	system	transfer	6d9a8f0bb6674cae99ca3bf1e8b2f3ac	3781c9367c5b423b80c59e187b9c9247	669312
3	4	stake	burn	caac07c136ba4db5a606888731a579dd	71a39af9f8dc49f0b5f5cc9e08920a94	584315
4	3	system	burn	1e5a44e34236468db9206afd624734a0	97c3ec4455a54286a8a23f0055fea1a3	893324
5	10	spl-token	transfer	bfe1958d09c04540b24913cf34f4d1ec	006789ca77d045e5b7caee3caa040154	301128
6	5	system	transfer	ffd329a1ec4746998ed1774e2a11fa8b	30503265677b4569b00dad75accd21af	339472
7	8	system	delegate	b19ab7a309dc44d5866a384de5f8918f	48fb59e6844c45148aa0df64762ffc5b	461483
8	8	spl-token	mint	73f2cfa9aa894e93b8c7b8b486f3dc3a	406b3038929f4530bde0533012ac524d	129428
9	2	system	mint	6b1986fcb4504b45b24989d267b048fc	0cb7df947ab84b35904fbd2b5ccfc969	977534
10	7	system	mint	2ef88c2edfac4043a75eadee6f9d1c98	0c08a47ec67f41d3bb8749c1e424fd6d	974883
11	2	stake	burn	dd900a3294254f3385d0a2fa2ae4edab	b444222722804c5482cf2f6d620d8c21	493960
12	7	system	transfer	7dc7165779d8466fa3fd816619208c58	d2c04917106740e68a98ba25b1636f3f	258310
13	4	spl-token	mint	a9dd77d18dcf4f5f819d3087064eb79f	a5feb39b6bbb46e58874db2125b55773	743796
14	10	stake	burn	f09288935fe0457fa369df8098efd882	5dbf4cf5e56b4619a53f9cf40497f2c8	2586
15	5	system	transfer	999debbe7c6f400a8ada3a2c13bd7743	91074801f902433dae76067007284341	380366
\.


--
-- Data for Name: transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.transactions (id, transaction_hash, status, block_time, fee, signer, source, inserted_at) FROM stdin;
1	df2c796725e74f239d07ecf70f856f55	Pending	2025-06-19 22:07:03	9395	290d6420797a477a9ecd1f4802ff0cdf	synthetic	2025-06-22 18:50:41.612897
2	d44c301413e043229bed5213eb5d7fa4	Pending	2025-05-28 10:53:56	9348	42ce4dd176cb4706b08f1a58fca6b7c3	synthetic	2025-06-22 18:50:41.612897
3	89d34d8c875440d092c3ff0f9169e00a	Failed	2025-06-13 01:59:42	5113	9afaf4cc8e2f4d59a28ae113fbd63490	synthetic	2025-06-22 18:50:41.612897
4	9f62723e9013473bb7fb3631cb44e72c	Failed	2025-05-25 14:33:06	5090	cc4b2fb0b7114ccb96e0e3dd5385c776	synthetic	2025-06-22 18:50:41.612897
5	507cb3997b1b4946b66b2c7dfa3cc059	Confirmed	2025-06-04 20:10:23	5583	dd6a5eba18ea42dbaf066e7d839bfda2	synthetic	2025-06-22 18:50:41.612897
6	6774376bc1cb45b181db9747734cddf9	Confirmed	2025-06-13 20:31:39	9662	f0a756acfd4f4d5bb7750668f9d9f025	synthetic	2025-06-22 18:50:41.612897
7	d90536eb7e4d4ac69ce0cc153fd1fd4b	Confirmed	2025-06-02 01:38:05	9360	7d5ec9a055844458b3f924e2c2d3d513	synthetic	2025-06-22 18:50:41.612897
8	3519873be60e4cbcabacc36f2099db1f	Confirmed	2025-06-19 16:22:16	6758	9ed6f5aff27a48debeefe8060bc68dd4	synthetic	2025-06-22 18:50:41.612897
9	6fc4b06bc4d34b93ad58a9ed0239c013	Confirmed	2025-06-07 02:33:18	6539	16f0e942d4874974978b79eb8c54db98	synthetic	2025-06-22 18:50:41.612897
10	2ac051a66fa843b7ab970e2f533a0fbb	Failed	2025-06-12 01:49:36	9806	8e6080ccc7cf45a79effd175e8399848	synthetic	2025-06-22 18:50:41.612897
\.


--
-- Data for Name: wallet_balances; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.wallet_balances (id, address, balance_lamports, token, source, retrieved_at) FROM stdin;
1	5223de5cc2f246608f10cbeee6ed874d	91782388	SOL	synthetic	2025-06-08 19:40:53
2	e876f29addd84daea690c72e7f8b3273	24968774	SOL	synthetic	2025-06-09 05:25:15
3	bf74c37931cd4d5db2663e4ea4ec55b5	46311606	SOL	synthetic	2025-05-24 06:10:18
4	1d6c0c6c6e474194b5a6cc7acdec052b	67837701	SOL	synthetic	2025-05-31 05:00:18
5	5f1f8b752fc549e9b710ed1906e3c7e9	15552608	SOL	synthetic	2025-06-17 15:44:00
6	1822a953ce294ac190e6b53ccf2f14b6	41252406	SOL	synthetic	2025-05-24 03:59:27
7	373764a856b4468f98bee4a9295d0b72	5637661	SOL	synthetic	2025-06-07 12:35:12
8	ffb682cfb35542ac961cac6ee02e74d0	3388757	SOL	synthetic	2025-05-30 03:28:52
9	338da563323a4d4a947e4599e981dcf9	54713863	SOL	synthetic	2025-06-13 05:12:21
10	e21ce8ee28e94762aeee693f1bc7658f	65119374	SOL	synthetic	2025-06-05 15:20:04
11	50cdbbaf353c4d4d94220165073052b3	19134732	SOL	synthetic	2025-05-31 18:31:35
12	78ae2a3df65a4cd099c13834eb3cd21d	39648433	SOL	synthetic	2025-06-20 23:48:33
13	0ab0821de20247fa8523ef0c15478ac0	73216990	SOL	synthetic	2025-06-02 08:53:40
14	8956ccdc24574c61afcfa453dbf64758	11552937	SOL	synthetic	2025-06-01 20:51:44
15	3ac86f3389ef42fcb703c298798bad21	23553282	SOL	synthetic	2025-05-30 17:51:07
16	cc958ca78fee4ae3b0ad267337881ba4	24587536	SOL	synthetic	2025-06-11 22:03:35
17	e4e7fb2ad4ed4f27a8c2de6cb99ba21f	48940166	SOL	synthetic	2025-06-19 19:29:36
18	9ecad64f4446482895b49497aba73b96	57465071	SOL	synthetic	2025-06-06 15:18:09
19	15ab5efe8cbd4a2989c17c3e85b5ec15	38185957	SOL	synthetic	2025-06-17 18:12:11
20	1a976ae139b3435eb74df8ef90765512	65544828	SOL	synthetic	2025-06-07 19:50:15
\.


--
-- Name: instructions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.instructions_id_seq', 1, false);


--
-- Name: transactions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.transactions_id_seq', 1, false);


--
-- Name: wallet_balances_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.wallet_balances_id_seq', 1, false);


--
-- Name: instructions instructions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instructions
    ADD CONSTRAINT instructions_pkey PRIMARY KEY (id);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: wallet_balances wallet_balances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.wallet_balances
    ADD CONSTRAINT wallet_balances_pkey PRIMARY KEY (id);


--
-- Name: instructions instructions_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instructions
    ADD CONSTRAINT instructions_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

